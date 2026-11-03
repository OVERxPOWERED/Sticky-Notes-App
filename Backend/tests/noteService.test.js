{
  "tool": "bash",
  "args": {
    "command": "find /mnt/artifacts -type f -name '*.js' -o -name '*.json' | head -100"
  }
}
{
  "tool": "bash",
  "args": {
    "command": "find /mnt/artifacts -type f -name 'noteService*' -o -name 'Note*' | head -50"
  }
}
{
  "tool": "bash",
  "args": {
    "command": "cat /mnt/artifacts/Backend/src/services/noteService.js 2>/dev/null || cat /mnt/artifacts/backend/src/services/noteService.js 2>/dev/null"
  }
}
{
  "tool": "bash",
  "args": {
    "command": "cat /mnt/artifacts/Backend/models/Note.js 2>/dev/null || cat /mnt/artifacts/backend/models/Note.js 2>/dev/null"
  }
}
{
  "tool": "bash",
  "args": {
    "command": "cat /mnt/artifacts/Backend/tests/noteService.test.js 2>/dev/null || cat /mnt/artifacts/backend/tests/noteService.test.js 2>/dev/null"
  }
}
{
  "tool": "bash",
  "args": {
    "command": "cat /mnt/artifacts/Backend/package.json 2>/dev/null || cat /mnt/artifacts/backend/package.json 2>/dev/null"
  }
}