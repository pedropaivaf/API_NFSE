
# 🗄️ Setup do Supabase Storage

Para que o upload de arquivos funcione, você precisa criar dois **Buckets** no seu projeto Supabase:

## 1. Bucket `certificates`
- **Public**: `false` (Privado)
- **Allowed MIME types**: `application/x-pkcs12` (ou vazio para aceitar tudo)
- **File size limit**: 5MB

## 2. Bucket `xmls`
- **Public**: `false` (Privado - Notas fiscais são sensíveis)
- **Allowed MIME types**: `text/xml`, `application/xml`
- **File size limit**: 10MB

> [!NOTE]
> O backend usará a `SUPABASE_SERVICE_ROLE_KEY` (se configurado para admin) ou Policies permissivas para gravar nesses buckets.
