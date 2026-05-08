import { parseWebhookMessage } from './supabase/functions/_shared/uzapi.ts';

const SIMULATED_PAYLOAD = {
  "object": "whatsapp_business_account",
  "entry": [
    {
      "id": "343829050555683",
      "changes": [
        {
          "field": "messages",
          "value": {
             "contacts": [{"wa_id":"556992512737","profile":{"name":""}}],
             "metadata": {"phone_number_id":"586716239954464","display_phone_number":"559984041462"},
             "statuses": [{"id":"3EB0D389563F7D5BFE6610","status":"delivered","timestamp":"1775686936","recipient_id":""}],
             "messaging_product":"whatsapp"
          }
        }
      ]
    }
  ]
};

console.log(parseWebhookMessage(SIMULATED_PAYLOAD));
