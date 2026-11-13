package main

# P06-T06-S01-M01
# Deny any plaintext Secret in the repo. External Secrets Operator marks
# managed Secrets with the annotation `external-secrets.io/managed-by: "true"`.
# Kubernetes auto-generates `kubernetes.io/service-account-token` Secrets,
# which are allowed by type.

allowed_secret_types := {"kubernetes.io/service-account-token"}

deny[msg] {
    input.kind == "Secret"
    not is_eso_managed
    not is_service_account_token
    has_payload
    msg := sprintf(
        "Plaintext Secret '%s' in namespace '%s' is forbidden. Use ExternalSecret backed by Vault.",
        [object.get(input.metadata, "name", "unknown"), object.get(input.metadata, "namespace", "default")]
    )
}

is_eso_managed {
    input.metadata.annotations["external-secrets.io/managed-by"] == "true"
}

is_service_account_token {
    t := object.get(input, "type", "")
    allowed_secret_types[t]
}

has_payload {
    data := object.get(input, "data", {})
    count(data) > 0
}

has_payload {
    sd := object.get(input, "stringData", {})
    count(sd) > 0
}