#!/usr/bin/env python3
import argparse, json, os, time, urllib.parse, urllib.request
import jwt

BASE="https://api.appstoreconnect.apple.com/v1"

def token(key_id, issuer_id, key_path):
    key=open(key_path,"r",encoding="utf-8").read()
    now=int(time.time())
    return jwt.encode({"iss":issuer_id,"iat":now,"exp":now+900,"aud":"appstoreconnect-v1"}, key, algorithm="ES256", headers={"kid":key_id,"typ":"JWT"})

def get(path, bearer):
    req=urllib.request.Request(BASE+path,headers={"Authorization":"Bearer "+bearer})
    with urllib.request.urlopen(req,timeout=30) as r:
        return json.load(r)

def main():
    p=argparse.ArgumentParser()
    p.add_argument("--bundle-id",default="org.aftergraph.ios")
    p.add_argument("--wait-build",action="store_true")
    p.add_argument("--timeout",type=int,default=900)
    a=p.parse_args()
    kid=os.environ["APPLE_API_KEY_ID"]; issuer=os.environ["APPLE_API_ISSUER_ID"]; kp=os.environ["APPLE_API_KEY_PATH"]
    bearer=token(kid,issuer,kp)
    q=urllib.parse.quote(a.bundle_id,safe="")
    apps=get(f"/apps?filter[bundleId]={q}&limit=5",bearer)["data"]
    if not apps:
        raise SystemExit(f"APP_RECORD_MISSING bundleId={a.bundle_id}")
    app=apps[0]
    print("APP_OK", app["id"], app["attributes"].get("name"), app["attributes"].get("bundleId"))
    versions=get(f"/apps/{app['id']}/appStoreVersions?limit=50",bearer)["data"]
    print("VERSIONS",[(v["id"],v["attributes"].get("versionString"),v["attributes"].get("appStoreState")) for v in versions])
    if not a.wait_build:
        return
    deadline=time.time()+a.timeout
    while time.time()<deadline:
        builds=get(f"/builds?filter[app]={app['id']}&sort=-uploadedDate&limit=5",bearer)["data"]
        if builds:
            b=builds[0]
            print("BUILD_OK",b["id"],b["attributes"].get("version"),b["attributes"].get("processingState"))
            return
        print("WAITING_FOR_BUILD", flush=True)
        time.sleep(20)
    raise SystemExit("BUILD_NOT_VISIBLE_BEFORE_TIMEOUT")

if __name__=="__main__":
    main()
