output "enabled" {
  description = "Services this module manages."
  value       = sort(var.services)
}
