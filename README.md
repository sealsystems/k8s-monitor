# K8s Monitor
[![Build Status](https://travis-ci.org/sealsystems/k8s-monitor.svg?branch=master)](https://travis-ci.org/sealsystems/k8s-monitor)
[![This image on DockerHub](https://img.shields.io/docker/pulls/sealsystems/k8s-monitor.svg)](https://hub.docker.com/r/sealsystems/k8s-monitor/)

(Based on https://github.com/stefanscherer/swarm-monitor)

`k8s-monitor` shows running pods (eg. replicas of a service) with the Blinkt! LED strip.

## Deployment

Use the following sample config to deploy the application:

 ```yaml
apiVersion: apps/v1
kind: DaemonSet
metadata:
  name: monitor
  labels:
    app: monitor
spec:
  selector:
    matchLabels:
      app: monitor
  template:
    metadata:
      labels:
        app: monitor
    spec:
      containers:
      - name: monitor
        image: sealsystems/k8s-monitor:latest
        securityContext:
          privileged: true
        volumeMounts:
        - mountPath: /sys
          name: sys-volume
        env:
        - name: MY_NODE_NAME
          valueFrom:
            fieldRef:
              fieldPath: spec.nodeName
      volumes:
      - name: sys-volume
        hostPath:
          path: /sys
 ```

By default, all pods in the `default` namespace are being counted. You can change the behavior via environment variables:

- `LABEL_SELECTOR` can be used to filter the pods you want to monitor. For more information about label selectors, see: https://kubernetes.io/docs/

- To observe another namespace, set environment variable `NAMESPACE`.

- For each running pod you see a white led. You can also assign colors to images by setting `IMAGE_COLORS` to a map of `image tag`-`color`-pairs:

  This sample assigns different colors to some Docker images:
  ```
  IMAGE_COLORS='{ "sample:1.0.0": [255, 0, 0, 1], "sample:2.0.0": [0, 255, 0, 1], "another-image:1.0.0": [0, 0, 255, 0.5]}'
  ```

  Please note: The 4th element of the color array contains brightness information in the range from `0.0` to `1.0`.

Using the sample deployment above, the application should run out of the box. The following environment variables should be set by the deployment config or k8s itself:

- `MY_NODE_NAME` (no default): nodeName of the current Host. See sample deployment config above for details.

- `KUBERNETES_SERVICE_HOST` (default: `kube-api-server`): Hostname of API server

- `KUBERNETES_PORT_443_TCP_PORT` (default: `443`): HTTPS port of API server
