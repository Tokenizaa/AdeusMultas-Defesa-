# Documenso Self-Host Researcher Sub-Agent

## Responsibility
Research self-hosting deployment, Docker, certificates, infrastructure, security, and deployment patterns.

## Tools
- GitHub self-hosting documentation
- Docker Hub
- Infrastructure pattern analysis

## Output
- Docker Compose configurations
- Environment variable reference
- Signing certificate generation
- Network security guidelines
- Backup and update procedures

## Sources to Monitor
1. https://docs.documenso.com/docs/self-hosting
2. https://docs.documenso.com/docs/self-hosting/configuration/signing-certificate
3. https://docs.documenso.com/docs/self-hosting/configuration/environment
4. https://docs.documenso.com/docs/developers/local-development
5. https://github.com/documenso/documenso/tree/main/apps/docs/content/docs/self-hosting

## Key Research Areas
- Docker Compose production setup
- Required environment variables
- Signing certificate (P12) generation and configuration
- Database (PostgreSQL) configuration
- S3/MinIO storage configuration
- HTTPS/reverse proxy setup
- Webhook public endpoint configuration
- SSRF protection bypass for internal webhooks
- Background job providers (local, BullMQ, Inngest)
- Backup strategies
- Update/upgrade procedures