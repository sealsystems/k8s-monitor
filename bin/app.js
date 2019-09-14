'use strict';

const fs = require('fs');

const Blinkt = require('node-blinkt');
const getenv = require('getenv');
const KubeWatch = require('kube-watch').default;
const leds = new Blinkt();

// eslint-disable-next-line no-process-env
process.env.NODE_TLS_REJECT_UNAUTHORIZED = '0';

let token = getenv('TOKEN', '');
if (token === '') {
  // Read file only if no token is given by environment to allow debugging outside of a pod
  // eslint-disable-next-line no-sync
  token = fs.readFileSync('/var/run/secrets/kubernetes.io/serviceaccount/token');
}
const config = {
  url: `https://${getenv('KUBERNETES_SERVICE_HOST', 'kube-api-server')}:${getenv(
    'KUBERNETES_PORT_443_TCP_PORT',
    '443'
  )}`,
  events: ['added', 'deleted'],
  namespace: getenv('NAMESPACE', 'default'),
  labelSelector: getenv('LABEL_SELECTOR', ''),
  fieldSelector: `spec.nodeName=${getenv('MY_NODE_NAME')}`,
  request: {
    auth: {
      bearer: token
    }
  }
};
const imageColors = JSON.parse(getenv('IMAGE_COLORS', `{}`));

console.log('CONFIG', config);

let pods = [];

const shutdown = function() {
  console.log('Turning off lights.');

  leds.setAllPixels(0, 0, 0, 0);
  leds.sendUpdate();
  leds.sendUpdate();

  process.nextTick(() => {
    console.log('Terminating process.');
    // eslint-disable-next-line no-process-exit
    process.exit(0);
  });
};

const init = function() {
  leds.setup();
  leds.clearAll();

  process.on('SIGINT', shutdown);
  process.on('SIGTERM', shutdown);
  console.log('Initialized.');
};

init();

const color = function(pod) {
  if (pod.animation <= 10) {
    pod.animation++;
  }

  // Starting container
  if (pod.mode === 'up') {
    if (pod.animation > 10) {
      pod.mode = 'running';
    }
    return [0, 255, 0, pod.animation * 0.08];
  }

  // Stopping container
  if (pod.mode === 'down') {
    if (pod.animation > 10) {
      pod.mode = 'remove';
    }
    return [255, 0, 0, (11 - pod.animation) * 0.08];
  }

  // Special colors based on image name
  for (const image in imageColors) {
    if (pod.image === image) {
      return imageColors[image];
    }
  }

  // Unknown image version
  return [255, 255, 255, 0.1];
};

setInterval(() => {
  leds.setAllPixels(0, 0, 0, 0);
  let i = 7;
  pods.forEach((pod) => {
    const col = color(pod);
    if (i > -1) {
      leds.setPixel(i--, col[0], col[1], col[2], col[3]);
    }
  });

  leds.sendUpdate();

  pods = pods.filter((item) => {
    return item.mode !== 'remove';
  });
}, 1000 / 30);

const watcher = new KubeWatch('pods', config);

watcher.on('added', (event) => {
  const pod = Object.assign(
    {},
    { name: event.metadata.name, image: event.spec.containers[0].image, mode: 'up', animation: 0 }
  );
  console.log('up', pod);
  pods.push(pod);
});

watcher.on('deleted', (event) => {
  const pod = pods.find((item) => {
    return item.name === event.metadata.name;
  });
  if (!pod) {
    return;
  }
  console.log('down', pod);
  pod.mode = 'down';
  pod.animation = 0;
});
