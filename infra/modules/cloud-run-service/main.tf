# The container port and resource values match what is live today, so the first
# apply is a deliberate change of name and identity only.
resource "google_cloud_run_v2_service" "this" {
  project  = var.project_id
  location = var.region
  name     = var.name
  labels   = var.labels

  deletion_protection = var.deletion_protection
  ingress             = "INGRESS_TRAFFIC_ALL"

  # The v2 API always reports a service-level scaling block, distinct from the
  # per-revision scaling inside `template`. Leaving it undeclared makes every
  # plan propose removing it, which is a no-op the API immediately undoes — a
  # perpetual diff that trains readers to ignore plans. Declared to match.
  scaling {
    min_instance_count = var.min_instance_count
  }

  template {
    service_account = var.service_account_email

    scaling {
      min_instance_count = var.min_instance_count
      max_instance_count = var.max_instance_count
    }

    containers {
      image = var.image

      # The app listens on $PORT; Cloud Run injects it. 8080 matches the
      # Dockerfile's EXPOSE and the server's default.
      ports {
        container_port = 8080
      }

      resources {
        limits = {
          cpu    = var.cpu
          memory = var.memory
        }
        startup_cpu_boost = true
      }

      dynamic "env" {
        for_each = var.env
        content {
          name  = env.key
          value = env.value
        }
      }
    }
  }

  traffic {
    type    = "TRAFFIC_TARGET_ALLOCATION_TYPE_LATEST"
    percent = 100
  }
}

# _iam_member, not _binding or _policy: those are authoritative and would strip
# any other invoker from the service.
resource "google_cloud_run_v2_service_iam_member" "public" {
  count = var.allow_public_access ? 1 : 0

  project  = var.project_id
  location = google_cloud_run_v2_service.this.location
  name     = google_cloud_run_v2_service.this.name
  role     = "roles/run.invoker"
  member   = "allUsers"
}
