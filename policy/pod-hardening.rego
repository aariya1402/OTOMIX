package main

# P06-T06-S01-M03
# Pod hardening + NetworkPolicy pairing.

allowed_namespace_exempt := {"kube-system", "kube-public", "kube-node-lease", "default"}

workloads := {"Deployment", "StatefulSet", "DaemonSet", "Job", "CronJob", "Pod"}

is_workload {
    workloads[input.kind]
}

workload_pod_spec := s {
    input.kind == "Pod"
    s := input.spec
}

workload_pod_spec := s {
    is_workload
    input.kind != "Pod"
    s := input.spec.template.spec
}

deny[msg] {
    is_workload
    ps := workload_pod_spec
    not ps.hostNetwork == false
    not ps.hostNetwork == null
    ps.hostNetwork == true
    msg := sprintf("%s '%s' sets hostNetwork=true", [input.kind, object.get(input.metadata, "name", "?")])
}

deny[msg] {
    is_workload
    ps := workload_pod_spec
    ps.hostPID == true
    msg := sprintf("%s '%s' sets hostPID=true", [input.kind, object.get(input.metadata, "name", "?")])
}

deny[msg] {
    is_workload
    ps := workload_pod_spec
    ps.hostIPC == true
    msg := sprintf("%s '%s' sets hostIPC=true", [input.kind, object.get(input.metadata, "name", "?")])
}

deny[msg] {
    is_workload
    ps := workload_pod_spec
    sc := object.get(ps, "securityContext", {})
    not sc.runAsNonRoot == true
    msg := sprintf("%s '%s' missing pod securityContext.runAsNonRoot=true", [input.kind, object.get(input.metadata, "name", "?")])
}

deny[msg] {
    is_workload
    ps := workload_pod_spec
    c := ps.containers[_]
    sc := object.get(c, "securityContext", {})
    not sc.readOnlyRootFilesystem == true
    msg := sprintf("container '%s' missing readOnlyRootFilesystem=true", [c.name])
}

deny[msg] {
    is_workload
    ps := workload_pod_spec
    c := ps.containers[_]
    sc := object.get(c, "securityContext", {})
    not sc.allowPrivilegeEscalation == false
    msg := sprintf("container '%s' missing allowPrivilegeEscalation=false", [c.name])
}

deny[msg] {
    is_workload
    ps := workload_pod_spec
    c := ps.containers[_]
    sc := object.get(c, "securityContext", {})
    caps := object.get(sc, "capabilities", {})
    drops := object.get(caps, "drop", [])
    not has_all(drops)
    msg := sprintf("container '%s' must drop ALL capabilities", [c.name])
}

has_all(drops) {
    drops[_] == "ALL"
}

deny[msg] {
    input.kind == "Namespace"
    not allowed_namespace_exempt[input.metadata.name]
    ann := object.get(input.metadata, "annotations", {})
    not ann["otomix.networkpolicy"] == "managed"
    msg := sprintf("Namespace '%s' missing annotation otomix.networkpolicy=managed (pair with default-deny NetworkPolicy)", [input.metadata.name])
}