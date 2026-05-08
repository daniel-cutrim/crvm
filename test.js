fetch("https://api.uzapi.com.br/cutrim/v1/586716239954464/chats", {
  method: "POST",
  headers: {
    "Authorization": "Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2VySWQiOiJlZDQ5ZDEyMy03ODg0LTRlNzEtYTVkOS1kZDdlNzY3ODQ1YjgiLCJ1c2VybmFtZSI6ImN1dHJpbSIsImluc3RhbmNlSWQiOiJlNjI4NTRiNC05ZWM1LTRjZTEtOTRmOC1jZTk2YWYzMDgzODUiLCJwaG9uZV9udW1iZXJfaWQiOiI1ODY3MTYyMzk5NTQ0NjQiLCJpYXQiOjE3NzU2MDYyOTQsImV4cCI6MTc3NTYwNjM1NH0.kjkzkQUKtNKWXBc5cfRKjiSm4DapGP5HsJViSzp-YdI",
    "Content-Type": "application/json"
  },
  body: JSON.stringify({
    delayMessage: 0,
    type: "chats",
    action: "get",
    chats: { message_id: "3AB35FADC00DB2A3E50C" }
  })
}).then(r => r.json()).then(data => console.log(JSON.stringify(data, null, 2))).catch(console.error);
