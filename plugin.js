/**
 * 代码编辑助手，功能包含:
 * 1.对NoteStation笔记的HTML源代码进行查看和编辑
 * 2.在NoteStation笔记中插入和编辑支持语法高亮的代码块
 * 3.修改插入区块(blockquote)的工具栏图标适配工具栏整体的风格
 * 4.修改在NoteStation笔记中插入的区块(blockquote)的样式
 */
tinymce.PluginManager.add("codehelper", function (noteEditor, sourceUrl) {
  let pluginName = "Code Helper";
  // 判断NoteStation是App形态还是web页面形态
  let nsMode = window.origin.substring(0, 16) == "chrome-extension" ? "app" : "web";
  // CodeMirror及highlight组件的路径
  let codeMirrorPath = sourceUrl + "/codemirror-5.65.7";
  let highLightPath = sourceUrl + "/highlight.js-11.5.1";
  let codeMirrorTheme = "codehelper"; // 缺省主题是default，深色主题可使用dracula
  let highLightTheme = "codehelper"; // 缺省主题是default，深色主题可使用dracula
  // 对话框窗体中面板的内边距
  let panelBodyLeft = nsMode == "web" ? 16 : 20; // css: x-panel-body
  let panelBodyTop = nsMode == "web" ? 10 : 8; // css: x-panel-body
  // 对话框窗体中字段间隙的外边距
  let fieldGapMargin = 6; // css: x-form-field-wrap
  // 对话框窗体中编辑器与父元素的高度差
  let editorReduceHight = 0;

  // 预加载窗体及编辑器
  // STEP 1: 加载被依赖的js和css
  Promise.all([
    loadJs(codeMirrorPath + "/lib/codemirror.js"),
    loadJs(highLightPath + "/highlight.min.js"),
    loadCss(codeMirrorPath + "/lib/codemirror.css"),
    loadCss(codeMirrorTheme != "default" ? codeMirrorPath + "/theme/" + codeMirrorTheme + ".css" : ""),
  ])
    .then((results) => {
      // STEP 2: 动态加载扩展的js和css
      return Promise.all([
        loadJs(codeMirrorPath + "/mode/meta.js"),
        loadJs(codeMirrorPath + "/mode/htmlmixed/htmlmixed.js"),
        loadJs(codeMirrorPath + "/mode/xml/xml.js"),
        loadJs(codeMirrorPath + "/mode/javascript/javascript.js"),
        loadJs(codeMirrorPath + "/mode/css/css.js"),
        loadJs(codeMirrorPath + "/addon/mode/loadmode.js"),
        loadJs(codeMirrorPath + "/addon/mode/simple.js"),
        loadJs(codeMirrorPath + "/addon/fold/foldcode.js"),
        loadJs(codeMirrorPath + "/addon/fold/foldgutter.js"),
        loadJs(codeMirrorPath + "/addon/fold/xml-fold.js"),
        loadJs(codeMirrorPath + "/addon/fold/brace-fold.js"),
        loadJs(codeMirrorPath + "/addon/fold/comment-fold.js"),
        loadJs(codeMirrorPath + "/addon/edit/closebrackets.js"),
        loadJs(codeMirrorPath + "/addon/edit/matchbrackets.js"),
        loadJs(codeMirrorPath + "/addon/edit/matchtags.js"),
        loadJs(codeMirrorPath + "/addon/edit/closetag.js"),
        loadJs(codeMirrorPath + "/addon/hint/show-hint.js"),
        loadJs(codeMirrorPath + "/addon/hint/xml-hint.js"),
        loadJs(codeMirrorPath + "/addon/hint/html-hint.js"),
        loadJs(codeMirrorPath + "/addon/display/fullscreen.js"),
        loadJs(codeMirrorPath + "/addon/dialog/dialog.js"),
        loadJs(codeMirrorPath + "/addon/search/searchcursor.js"),
        loadJs(codeMirrorPath + "/addon/search/search.js"),
        loadJs(codeMirrorPath + "/addon/search/matchesonscrollbar.js"),
        loadJs(codeMirrorPath + "/addon/search/jump-to-line.js"),
        loadJs(codeMirrorPath + "/addon/scroll/annotatescrollbar.js"),
        loadCss(codeMirrorPath + "/addon/fold/foldgutter.css"),
        loadCss(codeMirrorPath + "/addon/hint/show-hint.css"),
        loadCss(codeMirrorPath + "/addon/display/fullscreen.css"),
        loadCss(codeMirrorPath + "/addon/dialog/dialog.css"),
        loadCss(codeMirrorPath + "/addon/search/matchesonscrollbar.css"),
      ]);
    })
    .then((results) => {
      // STEP 3: 加载代码编辑器
      Ext.define("CodeHelper.Editor", {
        extend: "SYNO.ux.TextArea",
        mode: null, // 任何有效的CodeMirror mode
        theme: null, // 任何有效的CodeMirror theme
        editorConfig: {},
        /**
         * 初始化组件
         */
        initComponent: function () {
          // 开始初始化
          this.initialized = false;
          CodeMirror.modeURL = codeMirrorPath + "/mode/%N/%N.js";
          // 添加对话框中的样式定义，覆盖蒙层颜色和透明度的样式
          addCss(
            "div.codehelper-formpanel div.x-form-field-wrap{margin-bottom:" +
              fieldGapMargin +
              "px;}div.codehelper-formpanel form.x-panel-body{padding:" +
              panelBodyTop +
              "px " +
              panelBodyLeft +
              "px;}.ext-el-mask{background: black;opacity: 0.7;}",
            "codehelp_css"
          );
          this.on(
            {
              afterrender: function () {
                let self = this;
                let config = {
                  theme: self.theme || codeMirrorTheme, // 颜色主题
                  lineNumbers: true, // 启用行号
                  lineWrapping: true, // 启用折行
                  matchBrackets: true, // 启用突出显示匹配的括号
                  matchTags: { bothTags: true }, // 启用突出显示匹配的标记
                  autoCloseBrackets: true, // 启用自动闭合括号
                  autoCloseTag: true, // 启用自动闭合标记
                  foldGutter: true, // 启用折叠
                  gutters: ["CodeMirror-linenumbers", "CodeMirror-foldgutter"], // 装订线样式
                  extraKeys: {
                    "Ctrl-J": "toMatchingTag",
                    "Shift-Space": "autocomplete",
                    "'<'": completeAfter,
                    "'/'": completeIfAfterLt,
                    "' '": completeIfInTag,
                    "'='": completeIfInTag,
                    "Ctrl-F11": openFullscreen,
                    ESC: closeFullscreen,
                  },
                };
                Ext.applyIf(self.editorConfig, config);
                CodeHelper.Editor.superclass.initComponent.apply(this, arguments);
                // 创建codeEditor对象
                self.codeEditor = CodeMirror.fromTextArea(self.el.dom, self.editorConfig);
                self.codeEditor.on("change", function (/*cm, change*/) {
                  self.fireEvent("change", self, self.codeEditor.getValue());
                });
                self.codeEditor.on("blur", function (/*cm*/) {
                  self.fireEvent("blur", self);
                });
                self.codeEditor.on("focus", function (/*cm*/) {
                  self.fireEvent("focus", self);
                });
                // 延时设置mode
                (function () {
                  self.changeMode(self.mode);
                  self.codeEditor.focus();
                }.defer(201)); // magic number of 200 is defined in CodeMirror.requireMode...
                // 设置编辑器尺寸
                self.codeEditor.getWrapperElement().parentElement.style.width =
                  self.container.dom.clientWidth - panelBodyLeft * 2 + "px";
                self.codeEditor.getWrapperElement().parentElement.style.height =
                  self.container.dom.clientHeight - editorReduceHight - panelBodyTop * 2 + "px";
                self.codeEditor.setSize(
                  self.container.dom.clientWidth - panelBodyLeft * 2,
                  self.container.dom.clientHeight - editorReduceHight - panelBodyTop * 2
                );
                // 光标移到文档结束处
                self.codeEditor.execCommand("goDocEnd");
                self.initialized = true;
                // 初始化结束，刷新界面
                (function () {
                  self.codeEditor.refresh();
                }.defer(1));
              },
              resize: function (self, width, height) {
                if (self.codeEditor) {
                  // 重算编辑器尺寸
                  self.codeEditor.getWrapperElement().parentElement.style.width = width + "px";
                  self.codeEditor.getWrapperElement().parentElement.style.height = height - editorReduceHight + "px";
                  self.codeEditor.setSize(width, height - editorReduceHight);
                }
              },
            },
            this
          );
        },
        /**
         * 获取已修改的代码
         * @returns 已修改的代码
         */
        getValue: function () {
          if (this.initialized) {
            this.codeEditor.save();
          }
          return CodeHelper.Editor.superclass.getValue.apply(this, arguments);
        },
        /**
         * 设置待修改的代码
         * @param {*} v 待修改的代码
         * @returns
         */
        setValue: function (v) {
          var self = this;
          if (this.initialized) {
            this.codeEditor.setValue(v || "");
            (function () {
              self.codeEditor.refresh(); // 必须刷新，否则在编辑器中第一次更改之前chrome会显示旧内容
            }.defer(1));
          }
          return CodeHelper.Editor.superclass.setValue.apply(this, arguments);
        },
        /**
         * 验证待修改的代码
         */
        validate: function () {
          this.getValue();
          CodeHelper.Editor.superclass.validate.apply(this, arguments);
        },
        /**
         * 更换CodeMirror编辑器的mode
         * @param {*} val 新模式的MIME
         */
        changeMode: function (val) {
          let m, mode, spec;
          if ((m = /.+\.([^.]+)$/.exec(val))) {
            let info = CodeMirror.findModeByExtension(m[1]);
            if (info) {
              mode = info.mode;
              spec = info.mime;
            }
          } else if (/\//.test(val)) {
            let info = CodeMirror.findModeByMIME(val);
            if (info) {
              mode = info.mode;
              spec = val;
            }
          } else {
            mode = spec = val;
          }
          if (mode) {
            this.codeEditor.setOption("mode", spec);
            CodeMirror.autoLoadMode(this.codeEditor, mode);
          } else {
            this.codeEditor.setOption("mode", "");
          }
        },
      });
      // STEP 4: 定义对话框窗体
      Ext.define("CodeHelper.Window", {
        extend: "SYNO.SDS.NoteStation.ModalWindow",
        /**
         * 构建函数
         * @param {*} config 配置
         */
        constructor: function (config) {
          this.width = 850; // css: codehelper-window
          this.height = 560; // css: codehelper-window
          (this.owner = config.owner), this.callParent([this.fillConfig(config)]);
        },
        /**
         * 填充配置
         * @param {*} config 配置
         * @returns
         */
        fillConfig: function (config) {
          var windowConfig = {
            cls: "codehelper-window",
            // 配置对话框窗体布局
            width: config.width || this.width,
            width: config.height || this.height,
            autoHeight: false,
            padding: "0px",
            layout: "fit",
            // 配置界面元素
            items: this.getFormPanel(config),
            // 配置按钮
            buttons: [
              {
                xtype: "syno_button",
                text: SYNO.SDS.NoteStation._T("common", "cancel"),
                handler: this.onCancel,
                scope: this,
              },
              {
                disabled: false,
                xtype: "syno_button",
                btnStyle: "blue",
                text: SYNO.SDS.NoteStation._T("common", "ok"),
                handler: this.onOk,
                scope: this,
              },
            ],
            // 配置热键
            keys: [
              {
                key: Ext.EventObject.F11,
                ctrl: true,
                fn: function () {
                  openFullscreen(this.editorField.codeEditor); // 开启全屏
                },
                scope: this,
              },
              {
                key: Ext.EventObject.ESC,
                fn: function () {
                  closeFullscreen(this.editorField.codeEditor); // 关闭全屏
                },
                scope: this,
              },
            ],
            // 配置监听器
            listeners: {
              resize: function (window, adjWidth, adjHeight, rawWidth, rawHeight) {
                this.editorField.setSize(
                  rawWidth - panelBodyLeft * 2,
                  rawHeight - this.header.dom.clientHeight - this.footer.dom.clientHeight - panelBodyTop * 2
                );
              },
            },
          };
          return Ext.apply(windowConfig, config);
        },
        /**
         * 获取窗体面板
         * @param {*} config 配置
         * @returns
         */
        getFormPanel: function (config) {
          this.formFields = [];
          if (config.toolbar) {
            this.formFields.push(config.toolbar.item);
            editorReduceHight = config.toolbar.height + fieldGapMargin;
          } else {
            editorReduceHight = 0;
          }
          this.editorField = new CodeHelper.Editor({
            xtype: "syno_cmcode",
            itemCls: "codehelper-editor",
            id: "code",
            name: "code",
            mode: config.mode, // HTML混合模式
            value: config.value,
            theme: codeMirrorTheme, // 主题
            hideLabel: true,
            allowBlank: true,
            enableKeyEvents: true,
          });
          this.formFields.push(this.editorField);
          this.formPanel = new SYNO.ux.FormPanel({
            cls: "codehelper-formpanel",
            hideLabel: false,
            hideLabels: false,
            autoFlexcroll: false,
            layout: "fit",
            items: this.formFields,
          });
          return this.formPanel;
        },
        /**
         * 响应确定按钮的点击事件
         */
        onOk: function () {
          let values = {};
          for (let field of this.formFields) {
            values[field.name] = field.getValue();
          }
          this.onSubmit(values); // 将表单的数据返回给回调函数
          this.close();
        },
        /**
         * 响应取消按钮的点击事件
         */
        onCancel: function () {
          this.close();
        },
        /**
         * 拦截ESC关闭窗体的行为
         */
        onEsc: function () {
          // 默认窗体的基类SYNO.SDS.BaseWindow中定义了ESC键关闭窗体，与关闭全屏模式的快捷键冲突，这里用空方法覆盖掉基类的行为
        },
      });
      // STEP 5: 扩展highlightjs的着色规则
      hljs.addPlugin({
        "after:highlight": highlightJsExtension,
      });
    });

  /**
   * 判断是否代码块区域
   * @param {*} node 内容区域
   * @returns
   */
  function isCodeBlock(node) {
    return (
      node &&
      node.nodeName.toUpperCase() === "PRE" &&
      node.firstChild &&
      node.firstChild.nodeName.toUpperCase() === "CODE"
    );
  }
  /**
   * 获取当前选中的代码块
   */
  function getSelectedCodeBlock() {
    if (noteEditor.selection) {
      let node = noteEditor.selection.getNode();
      if (isCodeBlock(node)) {
        return node;
      }
    }
    return null;
  }
  /**
   * 向NoteStation的内容编辑器中回写代码块
   */
  function insertCodeBlock(language, code, node) {
    if (!code) return;
    noteEditor.undoManager.transact(function () {
      code = tinymce.util.Tools.resolve("tinymce.dom.DOMUtils").DOM.encode(code);
      if (node) {
        // 编辑代码块
        let childNode = node.firstChild;

        if (language === "auto") {
          noteEditor.dom.setAttrib(childNode, "class", "");
        } else {
          noteEditor.dom.setAttrib(childNode, "class", "language-" + language);
        }
        childNode.innerHTML = code; // 修改为新的代码块
        hljs.highlightElement(childNode); // 设置语法高亮

        noteEditor.selection.select(node); // 选中代码块
      } else {
        // 插入新的代码块
        let html =
          '<pre><code id="__new"' +
          (language === "auto" ? "" : ' class="language-' + language + '"') +
          ">" +
          code +
          "</code></pre>";
        noteEditor.insertContent(html); // 内容编辑器中插入代码块，新代码块的语法着色在内容编辑器的SetContent事件中处理
        noteEditor.selection.select(noteEditor.$("#__new").removeAttr("id")[0]); // 选中代码块
      }
    });
  }
  /**
   * 打开源代码编辑器
   */
  function openSourceCodeEditor() {
    new CodeHelper.Window({
      title: "HTML源代码",
      width: 850,
      height: 550,
      value: formatHTML(noteEditor.getContent()),
      mode: "htmlmixed",
      onSubmit: function (values) {
        noteEditor.setContent(values.code); // 回写已编辑的HTML文本
      },
    }).show();
  }
  /**
   * 打开代码块编辑器
   */
  function openCodeBlockEditor() {
    let currentNode = getSelectedCodeBlock();
    let languageStore = new Ext.data.JsonStore({
      autoDestroy: !0,
      fields: ["text", "value"],
      data: (() => {
        // 获取HighLight.js的通用语言列表
        let languages = [];
        let hightLightJsLanguages = hljs.listLanguages();
        hightLightJsLanguages.forEach((lang) => {
          languages.push({ text: hljs.getLanguage(lang).name, value: lang });
        });
        languages.sort((a, b) => {
          return a["text"].toLowerCase() > b["text"].toLowerCase() ? 1 : -1;
        });
        return [{ text: "自动", value: "auto" }, ...languages];
      })(),
    });
    let languageField = new SYNO.ux.ComboBox({
      xtype: "syno_combobox",
      itemCls: "codehelper-languageSeletcor",
      id: "language",
      name: "language",
      value: currentNode ? currentNode.firstChild.className.match(/language-(\w+)/)[1] : "auto",
      store: languageStore,
      displayField: "text",
      valueField: "value",
      hideLabel: true,
      mode: "local",
      scope: this,
      listeners: {
        select: function (obj, newValue, oldValue, eOpts) {
          this.ownerCt.ownerCt.editorField.changeMode(convertLanugaeMIME(newValue.data.value));
        },
      },
    });
    new CodeHelper.Window({
      title: "插入/编辑代码块",
      width: 850,
      height: 550,
      mode: convertLanugaeMIME(currentNode ? currentNode.firstChild.className.match(/language-(\w+)/)[1] : ""),
      node: currentNode, // 保存当前选中的代码块，在提交时回写
      value: currentNode ? currentNode.firstChild.textContent : "",
      toolbar: {
        item: languageField,
        height: 28,
      },
      onSubmit: function (values) {
        insertCodeBlock(values.language, values.code, this.node); // 回写代码块的内容
      },
    }).show();
  }
  // 添加TinyMCE命令
  noteEditor.addCommand("editSrcCode", openSourceCodeEditor);
  noteEditor.addCommand("editCodeBlock", openCodeBlockEditor);

  // 添加TinyMCE按钮
  noteEditor.addButton("srccode", {
    icon: "srccode",
    tooltip: "HTML源代码",
    cmd: "editSrcCode",
  });
  noteEditor.addButton("codeblock", {
    icon: "codeblock",
    tooltip: "插入/编辑代码块",
    cmd: "editCodeBlock",
    onSetup: function (api) {
      let nodeChangeHandler = function () {
        api.setActive(isBeCodeSampleSelection());
      };
      noteEditor.on("NodeChange", nodeChangeHandler);
      return function () {
        return noteEditor.off("NodeChange", nodeChangeHandler);
      };
    },
  });

  // 添加TinyMCE工具栏按钮
  noteEditor.settings.toolbar = "srccode | " + noteEditor.settings.toolbar.replace("hr", "codeblock blockquote hr");

  // TinyMCE事件处理
  noteEditor.on("PreInit", function (e) { // 初始化前事件，在加载编辑器后，加载编辑器内容前触发
    // SVG图标
    const svgs = {
      srccode:
        '<svg class="codehelp_svg" width="24" height="24" focusable="false" style="vertical-align: baseline"><path d="M9.8 15.7c.3.3.3.8 0 1-.3.4-.9.4-1.2 0l-4.4-4.1a.8.8 0 010-1.2l4.4-4.2c.3-.3.9-.3 1.2 0 .3.3.3.8 0 1.1L6 12l3.8 3.7zM14.2 15.7c-.3.3-.3.8 0 1 .4.4.9.4 1.2 0l4.4-4.1c.3-.3.3-.9 0-1.2l-4.4-4.2a.8.8 0 00-1.2 0c-.3.3-.3.8 0 1.1L18 12l-3.8 3.7z" fill="#505a64" fill-rule="nonzero"></path></svg>',
      codeblock:
        '<svg class="codehelp_svg" width="24" height="26" focusable="false" style="vertical-align: baseline"><path d="M7.1 11a2.8 2.8 0 01-.8 2 2.8 2.8 0 01.8 2v1.7c0 .3.1.6.4.8.2.3.5.4.8.4.3 0 .4.2.4.4v.8c0 .2-.1.4-.4.4-.7 0-1.4-.3-2-.8-.5-.6-.8-1.3-.8-2V15c0-.3-.1-.6-.4-.8-.2-.3-.5-.4-.8-.4a.4.4 0 01-.4-.4v-.8c0-.2.2-.4.4-.4.3 0 .6-.1.8-.4.3-.2.4-.5.4-.8V9.3c0-.7.3-1.4.8-2 .6-.5 1.3-.8 2-.8.3 0 .4.2.4.4v.8c0 .2-.1.4-.4.4-.3 0-.6.1-.8.4-.3.2-.4.5-.4.8V11zm9.8 0V9.3c0-.3-.1-.6-.4-.8-.2-.3-.5-.4-.8-.4a.4.4 0 01-.4-.4V7c0-.2.1-.4.4-.4.7 0 1.4.3 2 .8.5.6.8 1.3.8 2V11c0 .3.1.6.4.8.2.3.5.4.8.4.2 0 .4.2.4.4v.8c0 .2-.2.4-.4.4-.3 0-.6.1-.8.4-.3.2-.4.5-.4.8v1.7c0 .7-.3 1.4-.8 2-.6.5-1.3.8-2 .8a.4.4 0 01-.4-.4v-.8c0-.2.1-.4.4-.4.3 0 .6-.1.8-.4.3-.2.4-.5.4-.8V15a2.8 2.8 0 01.8-2 2.8 2.8 0 01-.8-2zm-3.3-.4c0 .4-.1.8-.5 1.1-.3.3-.7.5-1.1.5-.4 0-.8-.2-1.1-.5-.4-.3-.5-.7-.5-1.1 0-.5.1-.9.5-1.2.3-.3.7-.4 1.1-.4.4 0 .8.1 1.1.4.4.3.5.7.5 1.2zM12 13c.4 0 .8.1 1.1.5.4.3.5.7.5 1.1 0 1-.1 1.6-.5 2a3 3 0 01-1.1 1c-.4.3-.8.4-1.1.4a.5.5 0 01-.5-.5V17a3 3 0 001-.2l.6-.6c-.6 0-1-.2-1.3-.5-.2-.3-.3-.7-.3-1 0-.5.1-1 .5-1.2.3-.4.7-.5 1.1-.5z" fill-rule="evenodd" fill="#505a64"></path></svg>',
      blockquote:
        '<svg class="codehelp_svg" width="24" height="24" style="vertical-align: baseline"><path d="M7.5 17h.9c.4 0 .7-.2.9-.6L11 13V8c0-.6-.4-1-1-1H6a1 1 0 00-1 1v4c0 .6.4 1 1 1h2l-1.3 2.7a1 1 0 00.8 1.3zm8 0h.9c.4 0 .7-.2.9-.6L19 13V8c0-.6-.4-1-1-1h-4a1 1 0 00-1 1v4c0 .6.4 1 1 1h2l-1.3 2.7a1 1 0 00.8 1.3z" fill-rule="nonzero" fill="#505a64"></path></svg>',
    };
    // 替换工具栏图标
    for (let [key, svg] of Object.entries(svgs)) {
      let icon = document.getElementsByClassName("mce-i-" + key);
      if (icon && icon[0]) {
        icon[0].innerHTML = svg;
      }
    }
    // 在主页面中增加样式覆盖skin.min.css中定义的mce-i-blockquote:before的内容(图标)
    addCss(".mce-i-blockquote:before{content:''}.codehelp_svg:hover path{fill:#0086e6;}", "codehelp_blockquote");

    // 在内容编辑器的iFrame正文中添加highLight样式表
    this.dom.styleSheetLoader.load(
      highLightPath +
        (highLightTheme == "default" ? "/" + highLightTheme + ".min.css" : "/styles/" + highLightTheme + ".css")
    );
    // 在内容编辑器的iFrame正文中添加自定义样式表，包含区块(blockquote)的样式
    this.dom.styleSheetLoader.load(sourceUrl + "/style/codehelper_content.css");
  });
  noteEditor.on("SetContent", function () { // 设置编辑器内容事件，在内容解析并渲染后触发
    let unprocessedCodeBlock = noteEditor
      .$("pre")
      .filter(function (key, el) {
        return isCodeBlock(el);
      })
      .filter(function (key, el) {
        return el.contentEditable !== "false"; // 过滤出未锁住编辑的代码块
      });

    if (unprocessedCodeBlock.length) {
      noteEditor.undoManager.transact(function () {
        unprocessedCodeBlock.each(function (idx, el) {
          noteEditor
            .$(el)
            .find("br")
            .each(function (key, el) {
              el.parentNode.replaceChild(noteEditor.getDoc().createTextNode("\n"), el);
            });
          el.contentEditable = "false"; // 锁住代码块不允许编辑

          // 设置语法高亮
          let childNode = el.firstChild;
          childNode.innerHTML = noteEditor.dom.encode(childNode.textContent);
          hljs.highlightElement(childNode);

          el.className = noteEditor.$.trim(el.className);
        });
      });
    }
  });
  noteEditor.on("PreProcess", function (e) { // 加工前事件，在DOM节点序列化为HTML内容前触发
    noteEditor
      .$("pre[contenteditable=false]", e.node)
      .filter(function (key, el) {
        return isCodeBlock(el);
      })
      .each(function (key, el) {
        noteEditor.$(el).removeAttr("contentEditable");

        let code = el.textContent;

        let childNode = el.firstChild;
        noteEditor.$(childNode).empty();
        childNode.textContent = code;
      });
  });
  noteEditor.on("click",function (e) { // 单击事件
    let el = e.target;
    let node = noteEditor.$(el).closest("pre");
    if (node.length > 0 && isCodeBlock(node[0])) {
      // 如果点击的节点是代码块，则插入/编辑代码块的工具栏图标高亮显示
      document.getElementsByClassName("mce-i-codeblock")[0].firstChild.firstChild.setAttribute("fill","#0095ff");
    }else{
      document.getElementsByClassName("mce-i-codeblock")[0].firstChild.firstChild.setAttribute("fill","#505a64");
    }
  });
  noteEditor.on("dblclick", function (e) { // 双击事件
    let el = e.target;
    let node = noteEditor.$(el).closest("pre");
    if (node.length > 0 && isCodeBlock(node[0])) {
      // 如果点击的节点是代码块，则打开代码块编辑器
      openCodeBlockEditor();
    }
  });
  /**
   * 动态加载js文件
   * @param {*} srcUrl 文件地址
   * @returns Promise
   */
  function loadJs(srcUrl) {
    return new Promise((resolve, reject) => {
      // 判断当前js是否已经加载过
      const scriptNodes = [].slice.call(document.querySelectorAll("script")).map((item) => item.src);
      if (scriptNodes.includes(srcUrl)) return resolve();

      const script = document.createElement("script");
      script.type = "text/javascript";
    });
  }
  /**
   * 动态加载js文件
   * @param {*} srcUrl 文件地址
   * @returns Promise
   */
  function loadJs(srcUrl) {
    return new Promise((resolve, reject) => {
      if (srcUrl == "") return resolve();
      // 判断当前js是否已经加载过
      const scriptNodes = [].slice.call(document.querySelectorAll("script")).map((item) => item.src);
      if (scriptNodes.includes(srcUrl)) return resolve();

      const script = document.createElement("script");
      script.type = "text/javascript";
      script.src = srcUrl;
      document.body.appendChild(script);
      script.onload = () => {
        resolve();
      };
      script.onerror = (err) => {
        reject(err);
      };
    });
  }
  /**
   * 动态加载css文件
   * @param {*} hrefUrl 文件地址
   * @returns Promise
   */
  function loadCss(hrefUrl) {
    return new Promise((resolve, reject) => {
      if (hrefUrl == "") return resolve();
      // 判断当前css是否已经加载过
      const linkNodes = [].slice.call(document.querySelectorAll("link")).map((item) => item.href);
      if (linkNodes.includes(hrefUrl)) return resolve();

      const link = document.createElement("link");
      link.type = "text/css";
      link.rel = "stylesheet";
      link.href = hrefUrl;
      document.head.appendChild(link);
      link.onload = () => {
        resolve();
      };
      link.onerror = (err) => {
        reject(err);
      };
    });
  }
  /**
   * 动态加载css样式代码
   * @param {*} cssText css样式代码
   * @param {*} id 元素id
   * @returns Promise
   */
  function addCss(cssText, id) {
    // 删除已经加载过的元素
    let element = document.getElementById(id);
    element && element.remove();

    element = document.createElement("style");
    id && (element.id = id);
    element.type = "text/css";
    element.appendChild(document.createTextNode(cssText));
    document.head.appendChild(element);
  }
  /**
   * 格式化HTML文本
   * @param {*} html 待格式化的HTML文本
   * @returns 已格式化的HTML文本
   */
  function formatHTML(html) {
    let tab = "\t";
    let result = "";
    let indent = "";

    html.split(/>\s*</).forEach(function (element) {
      if (element.match(/^\/\w/)) {
        indent = indent.substring(tab.length);
      }

      result += indent + "<" + element + ">\r\n";

      if (element.match(/^<?\w[^>]*[^\/]$/) && !element.startsWith("input")) {
        indent += tab;
      }
    });

    return result.substring(1, result.length - 3);
  }
  /**
   * CodeMirror编辑器开启全屏模式
   * @param {*} cm CodeMirror编辑器
   */
  function openFullscreen(cm) {
    if (cm && !cm.getOption("fullScreen")) cm.setOption("fullScreen", true);
  }
  /**
   * CodeMirror编辑器关闭全屏模式
   * @param {*} cm CodeMirror编辑器
   */
  function closeFullscreen(cm) {
    if (cm && cm.getOption("fullScreen")) cm.setOption("fullScreen", false);
  }
  /**
   * CodeMirror触发Hint响应
   * @param {*} cm CodeMirror编辑器
   * @param {*} pred
   * @returns
   */
  function completeAfter(cm, pred) {
    var cur = cm.getCursor();
    if (!pred || pred())
      setTimeout(function () {
        if (!cm.state.completionActive) cm.showHint({ completeSingle: false });
      }, 100);

    return CodeMirror.Pass;
  }
  /**
   * CodeMirror触发Hint响应
   * @param {*} cm CodeMirror编辑器
   * @returns
   */
  function completeIfAfterLt(cm) {
    return completeAfter(cm, function () {
      var cur = cm.getCursor();
      return cm.getRange(CodeMirror.Pos(cur.line, cur.ch - 1), cur) == "<";
    });
  }
  /**
   * CodeMirror触发Hint响应
   * @param {*} cm CodeMirror编辑器
   * @returns
   */
  function completeIfInTag(cm) {
    return completeAfter(cm, function () {
      var tok = cm.getTokenAt(cm.getCursor());
      if (tok.type == "string" && (!/['"]/.test(tok.string.charAt(tok.string.length - 1)) || tok.string.length == 1))
        return false;

      var inner = CodeMirror.innerMode(cm.getMode(), tok.state).state;
      return inner.tagName;
    });
  }
  /**
   * 扩展highlightjs的着色规则
   * @param {*} result highlightjs着色的结果
   */
  function highlightJsExtension(result) {
    let rules = {
      // bash语法支持对任意命令及参数进行着色
      bash: [
        {
          condition: [/(^|\|\s*)(\w+)(?!\w)/gm], // 每行开头的单词，或管道命令"|"后接的单词，作为命令进行着色
          overwrite: "$1<span class='hljs-built_in'>$2</span>",
        },
        {
          condition: [/(?<!\S)(-{1,2}[A-Za-z0-9]*)(?!\w)/gm], // 以"-"或"--"作为起始符的单词，作为参数进行着色
          overwrite: "<span class='hljs-attr'>$1</span>",
        },
      ],
    };
    let rule = rules[result.language];
    if (rule) {
      for (let i in rule) {
        for (let j in rule[i]["condition"]) {
          let str = result.value;
          htmls = str.match(/<[^>]*>[^<]*<\/[^>]*>/g); // 得到HTML标记及其内容
          for (let m in htmls) {
            str = str.replace(/<[^>]*>[^<]*<\/[^>]*>/, "#" + m + "#"); // 将HTML标记及其内容替换为临时代码，避免干扰下面的替换语句
          }
          str = str.replace(rule[i]["condition"][j], rule[i]["overwrite"]); // 按照条件替换内容
          for (let m in htmls) {
            str = str.replace("#" + m + "#", htmls[m]); // 恢复被临时替换的HTML标记及其内容
          }
          result.value = str;
        }
      }
    }
  }
  /**
   * 将highlightjs的语言转换为CodeMirro的模式MIME
   */
  function convertLanugaeMIME(language) {
    map = {
      bash: "text/x-sh",
      c: "text/x-csrc",
      cpp: "text/x-c++src",
      csharp: "text/x-csharp",
      css: "text/css",
      diff: "text/x-diff",
      go: "text/x-go",
      ini: "text/x-properties",
      java: "text/x-java",
      javascript: "text/javascript",
      json: "application/json",
      kotlin: "text/x-kotlin",
      less: "text/x-less",
      lua: "text/x-lua",
      makefile: "text/x-cmake",
      markdown: "text/x-markdown",
      objectivec: "text/x-objectivec",
      perl: "text/x-perl",
      php: "application/x-httpd-php",
      "php-template": "text/x-php",
      plaintext: "",
      python: "text/x-python",
      "python-repl": "text/x-cython",
      r: "text/x-rsrc",
      ruby: "text/x-ruby",
      rust: "rust",
      scss: "text/x-scss",
      shell: "text/x-sh",
      sql: "text/x-sql",
      swift: "text/x-swift",
      typescript: "application/typescript",
      vbnet: "text/x-vb",
      xml: "application/xml",
      yaml: "text/x-yaml",
    };
    return map[language] ? map[language] : "";
  }
  return {
    getMetadata: function () {
      return { name: pluginName };
    },
  };
});