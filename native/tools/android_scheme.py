"""AndroidManifest.xml に、独自リンク 'kokuban://' で黒板アプリを開けるようにする設定（intent-filter）を足す。
現場アプリから kokuban://open?工事名=… を開くと、この黒板アプリが起動する。"""
import os, sys

here = os.path.dirname(os.path.abspath(__file__))
path = os.path.join(here, '..', 'android', 'app', 'src', 'main', 'AndroidManifest.xml')
t = open(path, encoding='utf-8').read()
if 'android:scheme="kokuban"' in t:
    print('すでに設定済みです')
    sys.exit(0)
flt = '''
            <intent-filter>
                <action android:name="android.intent.action.VIEW" />
                <category android:name="android.intent.category.DEFAULT" />
                <category android:name="android.intent.category.BROWSABLE" />
                <data android:scheme="kokuban" />
            </intent-filter>
'''
i = t.find('</activity>')
if i < 0:
    sys.exit('AndroidManifest.xml に </activity> が見つかりません')
open(path, 'w', encoding='utf-8').write(t[:i] + flt + '        ' + t[i:])
print("kokuban:// の起動設定を追加しました")
