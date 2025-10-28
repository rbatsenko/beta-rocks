-- Change chat_messages.id from UUID to TEXT
-- useChat generates short string IDs like "bubUY8wCVVr8g3r7", not UUIDs

-- First, drop the primary key constraint
ALTER TABLE public.chat_messages DROP CONSTRAINT chat_messages_pkey;

-- Change the column type to TEXT
ALTER TABLE public.chat_messages ALTER COLUMN id TYPE TEXT;

-- Recreate the primary key
ALTER TABLE public.chat_messages ADD PRIMARY KEY (id);

-- Remove the default UUID generation since we'll provide IDs from useChat
ALTER TABLE public.chat_messages ALTER COLUMN id DROP DEFAULT;
