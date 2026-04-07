# VPS Server Info — AgentPlayground

## Provider
- **Provider:** Hetzner Cloud
- **Plan:** CX42
- **Location:** (your chosen region)
- **Hostname:** vps1

## Specs
| Resource | Amount |
|---|---|
| vCPU | 8 (shared x86) |
| RAM | 16 GB |
| Root Disk | 160 GB NVMe SSD |
| Volume | 100 GB (ollama-data) |
| OS | Ubuntu 24.04 LTS |

## Network
| Field | Value |
|---|---|
| Public IPv4 | 95.217.163.247 |
| SSH | `ssh root@95.217.163.247` |

## Domain & DNS
| Field | Value |
|---|---|
| Domain | agentplayground.net |
| Registrar | GoDaddy |
| DNS Manager | Cloudflare |
| Nameserver 1 | laila.ns.cloudflare.com |
| Nameserver 2 | roan.ns.cloudflare.com |

## DNS Records (Cloudflare)
| Type | Name | Value | Proxy |
|---|---|---|---|
| A | @ | 95.217.163.247 | DNS only |
| A | * | 95.217.163.247 | DNS only |

## Services & URLs (after deployment)
| URL | Service |
|---|---|
| https://app.agentplayground.net | Agent Dashboard |
| https://n8n.agentplayground.net | n8n Automation |
| https://files.agentplayground.net | FileBrowser |
| https://manage.agentplayground.net | Portainer |
| https://agentplayground.net | Main Website |

## Repo
- **GitHub:** https://github.com/augustom1/agentplayground-vpsinstall
- **VPS path:** ~/opt/vps

## Monthly Cost (approx)
| Item | Cost |
|---|---|
| CX42 server | ~€16.00/mo |
| 100 GB Volume | ~€4.60/mo |
| Backups | ~€3.20/mo |
| **Total** | **~€23.80/mo** |
