# ADU Chatbot - Context-Aware Workflow Test

## How It Works

The updated chatbot now:
1. **Asks what you want to do** - identifies your procedure (build, demolish, etc.)
2. **Lists required documents** - shows exactly what you need for that procedure
3. **Tracks uploaded documents** - remembers what you've uploaded
4. **Checks completeness** - tells you what's still missing

## Test Flow

### Step 1: Initial Question (User doesn't know what they need)

**Request:**
```bash
POST http://127.0.0.1:8000/chatbot
Content-Type: application/json

{
  "question": "Vreau să construiesc o casă. Ce documente îmi trebuie?"
}
```

**Expected Response:**
```json
{
  "answer": "Pentru construcția unei case, ai nevoie de o Autorizație de Construire. Documentele necesare sunt: ...",
  "detected_procedure": "autorizatie_construire",
  "needs_documents": true,
  "suggested_action": "upload_documents",
  "available_procedures": [...]
}
```

### Step 2: Get Procedure Details

**Request:**
```bash
GET http://127.0.0.1:8000/procedures/autorizatie_construire
```

**Response shows all required documents:**
```json
{
  "procedure_name": "Autorizație de Construire",
  "description": "Autorizație pentru executarea lucrărilor de construire",
  "required_documents": [
    {
      "doc_type": "carte_identitate",
      "is_required": true,
      "description": "Carte de identitate valabilă a solicitantului"
    },
    ...
  ]
}
```

### Step 3: Upload Documents with Procedure Context

**Request:**
```bash
POST http://127.0.0.1:8000/upload?procedure=autorizatie_construire
Content-Type: multipart/form-data

files: [ci.jpg, plan_cadastral.pdf, act_proprietate.jpg]
```

**Response:**
```json
{
  "success": true,
  "procedure": "autorizatie_construire",
  "documents_processed": [
    {
      "filename": "ci.jpg",
      "document_type": "carte_identitate",
      "is_valid": true,
      "validation_message": "Document valid"
    },
    ...
  ],
  "missing_documents": [
    "Certificat de urbanism valabil",
    "Proiect tehnic întocmit de un arhitect autorizat"
  ],
  "summary": "Lipsesc pentru Autorizație de Construire: Certificat de urbanism valabil, Proiect tehnic..."
}
```

### Step 4: Continue Conversation with Context

**Request:**
```bash
POST http://127.0.0.1:8000/chatbot
Content-Type: application/json

{
  "question": "Cum obțin certificatul de urbanism?",
  "procedure": "autorizatie_construire",
  "uploaded_documents": ["carte_identitate", "plan_cadastral", "act_proprietate"]
}
```

**Response includes context:**
```json
{
  "answer": "Pentru certificatul de urbanism, trebuie să depui o cerere separată la primărie cu: carte de identitate (✅ ai deja), act de proprietate (✅ ai deja), și plan cadastral (✅ ai deja). Procesul durează 30 de zile...",
  "detected_procedure": "certificat_urbanism",
  "needs_documents": false,
  "suggested_action": "answer_questions"
}
```

## Available Procedures

1. **certificat_urbanism** - Certificat de Urbanism
   - carte_identitate (required)
   - act_proprietate (required)
   - plan_cadastral (required)

2. **autorizatie_construire** - Autorizație de Construire
   - carte_identitate (required)
   - certificat_urbanism (required)
   - act_proprietate (required)
   - plan_cadastral (required)
   - proiect_tehnic (required)

3. **autorizatie_desfiintare** - Autorizație de Desființare
   - carte_identitate (required)
   - act_proprietate (required)
   - plan_cadastral (required)
   - raport_tehnic (required)

4. **informare_urbanism** - Informare de Urbanism
   - carte_identitate (required)
   - plan_cadastral (required)

5. **racord_utilitati** - Racordare Utilități
   - carte_identitate (required)
   - act_proprietate (required)
   - certificat_urbanism (required)
   - plan_cadastral (required)

## Testing with cURL

```bash
# 1. Ask what documents are needed
curl -X POST http://127.0.0.1:8000/chatbot \
  -H "Content-Type: application/json" \
  -d '{"question": "Vreau să demolez o clădire veche. Ce documente îmi trebuie?"}'

# 2. Get all procedures
curl http://127.0.0.1:8000/procedures

# 3. Get specific procedure details
curl http://127.0.0.1:8000/procedures/autorizatie_desfiintare

# 4. Upload documents with procedure
curl -X POST "http://127.0.0.1:8000/upload?procedure=autorizatie_desfiintare" \
  -F "files=@ci.jpg" \
  -F "files=@act_proprietate.pdf" \
  -F "files=@plan_cadastral.jpg"

# 5. Continue conversation with context
curl -X POST http://127.0.0.1:8000/chatbot \
  -H "Content-Type: application/json" \
  -d '{
    "question": "Cât durează să obțin autorizația?",
    "procedure": "autorizatie_desfiintare",
    "uploaded_documents": ["carte_identitate", "act_proprietate", "plan_cadastral"]
  }'
```

## Frontend Integration

Your frontend should:

1. **Start with chatbot** - Let user ask what they want to do
2. **Extract detected_procedure** from response
3. **Show procedure details** using `/procedures/{procedure_key}`
4. **Upload with context** - Include `?procedure=xxx` in upload
5. **Continue chat** - Send procedure and uploaded_documents in subsequent messages
6. **Show progress** - Display which documents are uploaded vs missing

Example flow:
```
User: "Vreau să renovez casa"
Bot: "Pentru renovări, ai nevoie de..."
      [Detectează: certificat_urbanism]
      [Afișează: listă documente necesare]
      
User: [Uploads CI + Act Proprietate]
System: ✅ CI, ✅ Act Proprietate, ❌ Plan Cadastral

User: "Unde găsesc planul cadastral?"
Bot: "Planul cadastral se obține de la OCPI... [cu context că ai deja CI și Act]"
```
