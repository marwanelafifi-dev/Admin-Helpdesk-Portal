# Deployment Checklist — Attachment System Ready

**Date:** 24 Jun 2026  
**Status:** ✅ Code Ready for Production  
**Attachment System:** ✅ Complete & Backward Compatible  

---

## Pre-Deployment (Local Dev)

- [x] All 5 critical bugs fixed
- [x] 7 module forms refactored with new flow
- [x] API routes working (upload, delete, download)
- [x] Backup system covers attachments.json
- [x] Backward compatibility verified (old requests still work)
- [ ] **TODO: Download Backup JSON from Admin → Database** ← DO THIS NOW

---

## Backup Instructions (Do This First!)

```bash
# Option 1: Web UI (easiest)
# 1. Open http://localhost:3003
# 2. Go to Admin → Database
# 3. Click "Download Backup"
# 4. Save to D:\Backups\admin-helpdesk\

# Option 2: Command line (fastest)
xcopy d:\SWS\Git-Repos\admin-request-platform\data D:\Backups\admin-helpdesk\data-24-06-2026\ /E /I /Y
```

---

## Git Status

```
Branch: V1.0-18-05-2026
Commit: 7b2c728 "fix: complete server-side attachment system implementation"
Status: Clean (all changes committed)
```

---

## Ubuntu Deployment Steps

### 1. Pull Latest Code
```bash
cd ~/projects/admin-request-platform
git pull origin V1.0-18-05-2026
```

### 2. Build & Deploy
```bash
# Option A: Fresh rebuild
docker compose down --volumes
docker compose up --build -d

# Option B: Non-destructive rebuild (recommended)
docker compose up --build -d
```

### 3. Verify Containers
```bash
docker compose ps
# Should show:
# - admin-helpdesk-app     → healthy
# - admin-helpdesk-db      → healthy
# - postgres_data volume   → created
# - ~/admin-helpdesk-data  → mounted
# - ~/admin-helpdesk-Attachments → mounted
```

### 4. Restore Your Backup
```bash
# Open http://192.168.2.212:3003 (or your Cloudflare tunnel)
# Admin → Database → "Restore Backup"
# Upload your Backup-24-06-2026-complete.json
# Wait for success message
```

### 5. Test Everything
```bash
# ✅ Login works
# ✅ All requests appear
# ✅ All users/roles present
# ✅ Create new General Request with attachment
# ✅ File appears in ~/admin-helpdesk-Attachments/YYYY-MM/{id}/
# ✅ Can preview/download the file
# ✅ Preview opens in new tab (doesn't download)
```

---

## What Changed in This Release

### API Routes (New)
- `POST /api/requests/[id]/attachments/upload` → Save files to disk
- `DELETE /api/requests/[id]/attachments/[id]` → Delete file + metadata
- `GET /api/requests/[id]/attachments/[id]/download` → Stream file bytes

### Form Submission Flow (All 7 Modules)
```
Old: filesToAttachments → submitRequest → POST
New: submitRequest → filesToAttachments → updateRequest → pushToServer
     (get ID first!)
```

### Storage Changes
```
Old: Base64 in data/requests.json
     {"attachments": [{"url": "data:image/png;base64,iVBOR..."}]}
     ↑ Can be 10+ MB per request

New: Files on disk + metadata in data/attachments.json
     ~/admin-helpdesk-Attachments/2026-06/PRC-2026-0001/invoice.pdf
     {"attachments": [{"url": "/api/requests/.../attachments/.../download"}]}
     ↑ Requests stay < 1 MB
```

---

## Backward Compatibility

✅ Old requests with base64 attachments still work  
✅ Preview/Download buttons work identically  
✅ No migration needed  
✅ No data loss  

How? The `[index]/route.ts` proxy detects `data:` URLs and handles them specially.

---

## If Something Goes Wrong

### Rollback to Previous Version
```bash
git log --oneline | head -5
# Find the commit before 7b2c728
git reset --hard <previous-commit>
docker compose down
docker compose up --build -d
```

### Attachment Upload Fails
- Check `/app/attachments` directory exists and is writable
- Check `docker compose logs admin-helpdesk-app` for errors
- Verify request ID is being passed to upload route

### Restore Fails
- Check backup JSON is valid (open in VS Code)
- Check `data/` directory is writable
- Restart app: `docker compose restart admin-helpdesk-app`

### Old Requests Don't Show Attachments
- This shouldn't happen (backward compatible)
- If it does: check `[index]/route.ts` hasn't been modified
- Old attachment URLs should proxy through `/api/requests/{id}/attachments/{id}`

---

## Files to Monitor Post-Deployment

```
On Ubuntu host:
~/admin-helpdesk-data/
├── attachments.json         ← Created when first file uploaded
├── requests.json            ← Updated
└── ... (other JSON files)

~/admin-helpdesk-Attachments/
├── 2026-06/
│   ├── SHP-2026-0001/
│   │   ├── invoice.pdf
│   │   └── manifest.txt
│   └── ...
└── ...

Container logs:
docker compose logs -f admin-helpdesk-app | grep -i "attachment\|upload"
```

---

## Success Criteria

- [x] Code compiles without errors
- [x] Old requests with base64 attachments work
- [ ] New requests can be created with file attachments
- [ ] Files appear on disk in ~/admin-helpdesk-Attachments
- [ ] Files are downloadable and previewable
- [ ] Backup/restore system includes attachment metadata
- [ ] Admin → Database shows correct stats

---

## Next Steps

1. **Now:** Download backup JSON from local dev
2. **Deploy:** Push code to Ubuntu & rebuild containers
3. **Restore:** Upload backup JSON on Ubuntu
4. **Test:** Create new request with attachment
5. **Monitor:** Check container logs for errors

---

**Questions?** Check `/memory/` folder for detailed docs:
- `attachment_system_fix.md` — What was fixed
- `backward_compatibility_attachments.md` — How old requests work
- `backup_before_ubuntu_rebuild.md` — Backup strategy

**Ready to deploy?** 🚀

