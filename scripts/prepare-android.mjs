import {cpSync,existsSync,mkdirSync,readFileSync,writeFileSync} from 'node:fs';
import {dirname,join} from 'node:path';
import {spawnSync} from 'node:child_process';

const root=process.cwd();
const android=join(root,'android');
const appGradle=join(android,'app','build.gradle');
const rootGradle=join(android,'build.gradle');
const nativeSrc=join(root,'native','android','app','src');

function run(command,args,cwd=root){const result=spawnSync(command,args,{cwd,stdio:'inherit',shell:process.platform==='win32'});if(result.status!==0)process.exit(result.status??1)}
function patch(path,change){const before=readFileSync(path,'utf8'),after=change(before);if(after!==before)writeFileSync(path,after)}

if(!existsSync(join(android,'gradlew'))){run('npx',['cap','add','android'])}
run('npx',['cap','sync','android']);
patch(rootGradle,text=>text.includes('kotlin-gradle-plugin')?text:text.replace("classpath 'com.android.tools.build:gradle:","classpath 'org.jetbrains.kotlin:kotlin-gradle-plugin:2.1.20'\n        classpath 'com.android.tools.build:gradle:"));
patch(appGradle,text=>{
 let next=text.includes("apply plugin: 'org.jetbrains.kotlin.android'")?text:text.replace("apply plugin: 'com.android.application'","apply plugin: 'com.android.application'\napply plugin: 'org.jetbrains.kotlin.android'");
 if(!next.includes('kotlinOptions'))next=next.replace(/android \{/,"android {\n    kotlinOptions { jvmTarget = '21' }");
 return next;
});
if(existsSync(nativeSrc)){mkdirSync(join(android,'app','src'),{recursive:true});cpSync(nativeSrc,join(android,'app','src'),{recursive:true})}
const manifest=join(android,'app','src','main','AndroidManifest.xml');
if(existsSync(manifest))patch(manifest,text=>text.includes('androidx.core.content.FileProvider')?text:text.replace('</application>',`        <provider
            android:name="androidx.core.content.FileProvider"
            android:authorities="\${applicationId}.files"
            android:exported="false"
            android:grantUriPermissions="true">
            <meta-data
                android:name="android.support.FILE_PROVIDER_PATHS"
                android:resource="@xml/shaded_file_paths" />
        </provider>
    </application>`));
const pluginFile=join(android,'app','src','main','java','com','shadedlm','app','AssetStoragePlugin.kt');
if(existsSync(pluginFile)){
 const main=join(android,'app','src','main','java','com','shadedlm','app','MainActivity.java');mkdirSync(dirname(main),{recursive:true});writeFileSync(main,`package com.shadedlm.app;\n\nimport android.os.Bundle;\nimport com.getcapacitor.BridgeActivity;\n\npublic class MainActivity extends BridgeActivity {\n  @Override\n  public void onCreate(Bundle savedInstanceState) {\n    registerPlugin(AssetStoragePlugin.class);\n    super.onCreate(savedInstanceState);\n  }\n}\n`);
}
