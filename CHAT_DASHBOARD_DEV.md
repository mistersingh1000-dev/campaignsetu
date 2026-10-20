# Chat/Inbox Dashboard — Week 1 Sprint

## Day 1-2: Database & API ✅ DONE

### Files Created

**Database Layer:**
- `lib/chat-db.ts` — Firestore data access layer (conversations, messages, contacts)

**API Routes:**
- `app/api/chat/conversations/route.ts` — GET list all conversations
- `app/api/chat/conversations/[id]/route.ts` — GET specific conversation
- `app/api/chat/conversations/[id]/messages/route.ts` — GET messages in conversation
- `app/api/chat/send/route.ts` — POST send a message
- `app/api/chat/contacts/route.ts` — GET/POST contacts

### Firestore Collections

**conversations**
```
{
  id: "userId_contactPhone",
  userId: "email",
  phoneNumberId: "123456",
  wabaId: "789",
  contactPhone: "+1234567890",
  contactName: "John",
  lastMessage: "Hey!",
  lastMessageTime: "2026-07-25T...",
  unreadCount: 0,
  createdAt: "2026-07-25T..."
}
```

**messages**
```
{
  id: "auto-generated",
  conversationId: "userId_contactPhone",
  sender: "user" | "contact",
  content: "Hello",
  timestamp: "2026-07-25T...",
  status: "sent" | "delivered" | "read",
  waMessageId: null // WhatsApp message ID when integrated
}
```

**contacts**
```
{
  id: "userId_phone",
  userId: "email",
  phone: "+1234567890",
  name: "John",
  profileImage: null,
  lastMessageTime: "2026-07-25T..."
}
```

### API Endpoints

**GET /api/chat/conversations**
- Returns all conversations for logged-in user
- Ordered by lastMessageTime (newest first)

**GET /api/chat/conversations/[id]**
- Returns single conversation (auth check: must own it)

**GET /api/chat/conversations/[id]/messages**
- Returns last 50 messages in a conversation

**POST /api/chat/send**
```json
{
  "conversationId": "userId_contactPhone",
  "content": "Hello!"
}
```
- Checks trial/paid status
- Returns message object

**GET /api/chat/contacts**
- Returns all contacts for logged-in user

**POST /api/chat/contacts**
```json
{
  "phone": "+1234567890",
  "name": "John" // optional
}
```
- Creates new contact
- Returns contact object

### Next Steps (Day 3-4)

Build the **Chat Dashboard UI:**
- Conversation list component
- Message view component
- Contact sidebar
- Message input + send button

### Testing

All endpoints require:
- Valid session cookie (login first)
- User must own the resource (conversations/messages/contacts)

Example test:
```bash
# Login first, get session cookie
curl -X GET https://your-site.com/api/chat/conversations \
  -H "Cookie: wcp_session=..."
```

