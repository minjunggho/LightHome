# Photon iMessage adapter (optional ingestion)

A thin **Contract B producer**: reads inbound iMessages via
[Photon/Spectrum](https://photon.codes/) and POSTs each one to the Lighthome
backend's `/analyze-message`. The backend is unchanged — a real iMessage and a
replayed demo-JSON message look identical to it.

> **This is off the critical demo path.** The deterministic demo-JSON replay
> stays the primary input for judging. This adapter is the optional
> "it also works on real messages" moment.

## Scope & safety (non-negotiable)
- Point this at **your own** linked iMessage account only. Never anyone else's,
  and never a minor's. This is a child-safety prototype, not a surveillance tool.
- `PHOTON_DRY_RUN=true` (default) logs what it *would* send and posts nothing.
  Flip to `false` only when you intend to feed real messages in.
- Inbound **text only** — outbound (your own) messages and attachments are skipped.
- `ALLOWED_SPACES` optionally restricts to named conversations.

## Run
```bash
cd ingestion/photon
cp .env.example .env      # fill PROJECT_ID / PROJECT_SECRET from the Photon dashboard
npm install
# backend must be running: uvicorn app.main:app --port 8000
npm run dev               # dry-run by default; set PHOTON_DRY_RUN=false to go live
```

## Mapping (Spectrum message -> Contract B)
| Contract B field | Source |
|---|---|
| `session_id` | `imessage:<space.id>` |
| `turn` | per-space counter (0-based) |
| `speaker` | `message.sender.id` |
| `text` | `message.content.text` |
| `t_offset_sec` | seconds since first message seen in that space |

## Lane note
Ingestion is **Person 3's** integration lane, not Person 1's. This was built at
the team's request as a Contract-B client; it deliberately does **not** import or
touch the detection pipeline (`backend/app/`) — it only speaks HTTP to the
contract.
