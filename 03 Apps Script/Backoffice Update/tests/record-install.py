from pathlib import Path
import hashlib, json
root=Path(__file__).resolve().parent.parent
live=root.parent/'Live Source'/'Current-2026-09-10'
sha=lambda p:hashlib.sha256(p.read_bytes()).hexdigest()
manifest={
 'status':'INSTALLED_IN_LAB_EDITOR_AUTHORIZATION_PENDING',
 'date':'2026-09-10',
 'lab_spreadsheet_id':'158ekdEhxQC0hLIaUCz7cV3hx_XAVBeHuKYsD82HSszE',
 'lab_script_id':'1bupxRQ_TdiMQwdCh7UZYyjd42trmCQ_AbXlC8RlBmj1ZUbyCGBfc6Cgz',
 'original_script_id':'1sxaS-J3YmCyJKX98HlrPvQH1uw9fRqITHEHN8_xGyJOKyuZchvAYhkkp',
 'source_basis':'Actual current Apps Script editor snapshot; original /dev source',
 'tests_passed':19,
 'google_runtime_tests_passed':0,
 'editor_copy_verification':'All seven files match candidate after CRLF/LF normalization',
 'browser_qa':'synthetic_fixture_only; Google authorization pending',
 'deployment':'First web-app setup requested with Execute as Me / Only myself; authorization pending, no ready URL yet',
 'files':{p.name:sha(p) for p in root.iterdir() if p.suffix in ['.gs','.html']},
 'live_snapshot':{p.name:sha(p) for p in live.iterdir() if p.suffix in ['.gs','.html']},
 'source_differences':[
  'Core built from actual Code.gs including Facebook menu; spreadsheet resolver points only to LAB.',
  'WebApp built from actual webapp.gs (local v20 differs only by newline).',
  'Index local baseline preserves live features and adds Genre filter / Sub Genre inputs before five requested UI fixes.',
  'FbAlbum preserves actual _fbaOriginalIndex and duplicate helpers; token access and posting trigger installation throw LAB-only errors.',
  'LabChecks is manual LAB-only integration runner; never install in store.'
 ]}
(root/'manifest.json').write_text(json.dumps(manifest,ensure_ascii=False,indent=2)+'\n',encoding='utf-8')
(live/'snapshot-manifest.json').write_text(json.dumps({'date':'2026-09-10','source':'Current editor of original script (read-only copy)','scriptId':manifest['original_script_id'],'sha256':manifest['live_snapshot']},indent=2)+'\n',encoding='utf-8')
print('Recorded LAB install and source snapshot hashes')
