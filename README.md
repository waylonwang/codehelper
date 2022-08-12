# CodeHelper - Synology Note Station插件

代码编辑助手，用于扩展在Note Station笔记中记录代码段，或编辑笔记的源代码

### 安装方法：

#### 在DSM 7.x中安装：
1. 通过Git下载所有代码到"codehelper文件夹"
2. 将"codehelper文件夹"复制到Note Station的"插件文件夹"中
   1. "插件文件夹"位于：`/usr/syno/synoman/webman/modules/TinyMCE/js/tinymce/plugins`
3. 修改Note Station的"脚本代码"，增加对插件的引用描述
   1. "脚本代码"位于：`/usr/syno/synoman/webman/3rdparty/NoteStation/notestation.js`
   2. 用vim或nano打开notestation.js后找到`"syno_autolink syno_searchreplace hr syno_table"`，将其替换为`"syno_autolink syno_searchreplace codehelper hr syno_table"`
   3. 修改完成后保存
   4. 刷新DSM

#### 在Synology Note Station Client (Mac版本) 中安装：
1. 通过Git下载所有代码到"codehelper文件夹"
2. 将"codehelper文件夹"复制到Synology Note Station Client的"插件文件夹"中
   1. "插件文件夹"位于：`~/Applications/Synology Note Station Client.app/Contents/Resources/app.nw/webman/modules/TinyMCE/js/tinymce/plugins`
      1. 可在Finder中打开"用户目录"，在其中的"应用程序"文件夹下可以看到Synology Note Station Client的图标，右键点击该图标后选择"显示包内容"，然后逐级展开文件夹找到plugins
      2. 也可在终端中输入`cd ~/Applications/"Synology Note Station Client.app"/Contents/Resources/app.nw/webman/modules/TinyMCE/js/tinymce/plugins`进入plugins
3. 修改Note Station的"脚本代码"，增加对插件的引用描述
   1. "脚本代码"位于：`~/Applications/Synology Note Station Client.app/Contents/Resources/app.nw/webman/3rdparty/NoteStation/notestation.js`
   2. 打开notestation.js后找到`"syno_autolink syno_searchreplace hr syno_table"`，将其替换为`"syno_autolink syno_searchreplace codehelper hr syno_table"`
   3. 修改完成后保存
   4. 重启Synology Note Station Client