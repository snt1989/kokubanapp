"""iOSプロジェクトの Info.plist に、必要な設定を足す（Mac で、`npx cap add ios` のあとに実行）。
- URLスキーム 'kokuban'（現場アプリから kokuban://open?工事名=… で開く）
- 写真の保存・カメラの使用目的（iOSの必須項目）"""
import os, plistlib, sys

here = os.path.dirname(os.path.abspath(__file__))
path = os.path.join(here, '..', 'ios', 'App', 'App', 'Info.plist')
if not os.path.exists(path):
    sys.exit('Info.plist が見つかりません。先に `npx cap add ios` を実行してください: ' + path)
with open(path, 'rb') as f:
    d = plistlib.load(f)
types = d.setdefault('CFBundleURLTypes', [])
if not any('kokuban' in (t.get('CFBundleURLSchemes') or []) for t in types):
    types.append({'CFBundleURLName': 'jp.sanoh.kokuban', 'CFBundleURLSchemes': ['kokuban']})
d.setdefault('NSPhotoLibraryAddUsageDescription', '黒板つきの完成写真を、写真アプリに保存します。')
d.setdefault('NSPhotoLibraryUsageDescription', '写真を選んで、黒板を合成します。')
d.setdefault('NSCameraUsageDescription', '写真を撮影して、黒板を合成します。')
with open(path, 'wb') as f:
    plistlib.dump(d, f)
print('Info.plist を更新しました')
