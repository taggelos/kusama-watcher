# kusama-watcher :bird:

Information about the scope of the project can be found in https://gist.github.com/ironoa/40ee9e291b29c5af26d78ab238889edd
</br></br>
## Working environment

- CentOS Linux release 7.9.2009 (Core)
- Kubernetes version 1.21.1
- Docker version 20.10.6, API Version 1.41
- Helm v3.1.1
- Wireguard v1.0.20210424

## Opensource Projects used

- https://github.com/kubernetes-sigs/kubespray
- https://github.com/w3f/polkadot-validator-setup <i>(not necessary for our scope but it was used)</i>
- https://github.com/w3f/polkadot-watcher
- https://github.com/prometheus-community/helm-charts/tree/main/charts/kube-prometheus-stack
- https://github.com/WireGuard/wireguard-tools

---
</br>

> #### main branch

You need to set the environment variables for the server port and the validators list by using  ```source env_vars``` </br>
Run the program using ```yarn && yarn build && yarn start```</br>
Use ```docker build -t ksm-watcher . --network=host``` to build the docker image. 
</br></br>

> #### helmChartBranch branch

Here you can find the helmChart created for this application under <i>kusamaHelmChart</i> folder. </br>
This branch also consists of the values.yaml changes on the [kube-prometheus-stack](https://github.com/prometheus-community/helm-charts/tree/main/charts/kube-prometheus-stack)  chart. </br>
Trigger the Helm chart installation/upgrade by configuring the values.yaml and running inside the folder: </br>
``` helm upgrade ksm-watcher . -f values.yaml ```
</br></br>

> #### wireguard branch

For this branch we need to set our wireguard connection between 2 machines. </br>
In my case I had the kubernetes cluster with the prometheus instances and the application running in docker in another machine. </br>
In order to set your wireguard connection you can use the following [guide](https://www.wireguard.com/quickstart/).</br>
This process can be automated as well. </br>
In this branch there are the resources for kubernetes to communicate using the wg0 interface to the application on the other side. </br>
You can deploy them using ``` helm upgrade wireguard . -f values.yaml  ``` 


