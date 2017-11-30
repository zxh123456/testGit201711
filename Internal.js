define([ //
        "dojo/_base/lang", //
        "dojo/dom-construct",
        "dojo/_base/array", //
        "dojo/keys", //
        "dojo/dom-class", //
        "athena/dojo/templateAction/Base", //
        "athena/dojo/templateAction/Commonx", //
        "dojox/uuid/Uuid", //
        "dojox/uuid/generateTimeBasedUuid", //
        "athena/dojo/templateAction/TAVertical", //
        "athena/dojo/templateAction/TATree", //
        "dojo/_base/xhr", //
        "dojo/json", //
        "athena/dojo/data/util/transaction", //
        "athena/gridx/Grid", //
        "dojo/store/Memory",
        "dojo/io/iframe",
        "athena/dijit/ZTree",
        "athena/business/lar/Base"
    ], //
    function(lang, domConstruct, array, keys, domClass, tpa, common, uuid, generateTimeBasedUuid, TAVertical, TATree, xhr, json, transaction, Grid, Memory, ioIframe, ZTree, base) {
        //注册Internal
        var internal = tpa.register('lar.internal');
        lang.mixin(internal, {
            onLoad: function(id) {
                internal.pageName = "internal";
                internal.url = '../rest/lar/itr';
                base.onLoad.call(this, internal, id);
                dojo.connect(dojo.byId(id + "-internalSearchBtn"), "onclick", internal.searchWord);
                dojo.connect(dojo.byId(id + "-internalSearch"), "keyup", internal.searchWordEnter);
                dojo.connect(dojo.byId(id + "-searchRestBtn"), "onclick", internal.restSearchForm)
                dojo.connect(dojo.byId(id + "-fieldLabel"), "onclick", internal.searchField);
                internal.topTopOrBottom();
            },
            //重置表单
            restSearchForm: function() {
                base.restSearchForm.call(this, internal.tpaId, internal.tpaId + '-internal_search_Form');
            },
            //搜索域全选
            searchField: function() {
                base.searchField.call(this, internal.tpaId + "-internal_searchPanel");
            },
            //回到顶部
            topTopOrBottom: function() {
                base.topTopOrBottom.call(this, "#" + internal.tpaId + "-downloadPanel", "#" + internal.tpaId + "-rightTip");
            },
            //返回
            returnBack: function() {
                base.returnBack.call(this, internal);
            },
            //搜索
            searchWordEnter: function(e) {
                if (e.keyCode == keys.ENTER) {
                    internal.searchWord();
                }


            },
            searchWord: function() {
                var searchWord = dojo.byId(internal.tpaId + "-internalSearch").value.trim();
                var businessname = dojo.byId(internal.tpaId + "-internalBusiness").value.trim();
                var publisher = dojo.byId(internal.tpaId + "-internalUnitSearch").value.trim();
                var title = dojo.byId(internal.tpaId + "-internal_title").checked;
                var content = dojo.byId(internal.tpaId + "-internal_content").checked;
                var startDateObj = tpa.getWidget(internal.tpaId, 'startDate');
                var startDate = startDateObj.displayedValue;
                var endDateObj = tpa.getWidget(internal.tpaId, 'endDate');
                var endDate = endDateObj.displayedValue;

                if ((startDateObj.state == "Error" && startDate != "起始日期") || (endDateObj.state == "Error" && endDate != "截止日期")) {
                    common.showResultDialog({
                        'msg_info': "提示：您输入的日期不合法",
                        'msg_no': "1"
                    });
                    return;
                }
                startDate = startDate == "起始日期" ? "" : startDate;
                endDate = endDate == "截止日期" ? "" : endDate;
                if (startDate != "" && endDate != "") {
                    if (new Date(startDate).getTime() > new Date(endDate).getTime()) {
                        common.showResultDialog({
                            'msg_info': "提示：搜索的起始日期不能大于截止日期",
                            'msg_no': "1"
                        });
                        return;
                    }
                }
                if (searchWord == "" && businessname == "" && publisher == "" && startDate == "" && endDate == "") {
                    if (!internal.searchState) {
                        common.showResultDialog({
                            'msg_info': "提示：请先输入查询条件",

                            'msg_no': "1"
                        });
                        internal.searchState = false;
                        return;
                    }
                    internal.searchState = false;
                } else {
                    internal.searchState = true;
                }
                if ((searchWord != "") && (!content && !title)) {
                    common.showResultDialog({
                        'msg_info': "提示：请先设置搜索域",
                        'msg_no': "1"
                    });
                    return;
                }
                var containerWrap = dojo.byId(internal.tpaId + "-containerWrap");
                base.showLoading(containerWrap);
                internal.keyWord = searchWord;
                var paraArr = [];
                var paraObj = { "searchWord": searchWord, "businessname": businessname, "publisher": publisher, "content": content, "title": title, "startDate": startDate, "endDate": endDate };
                var rm_index = 0;
                for (var paraKey in paraObj) {
                    if (rm_index == 0) paraArr.push(paraKey + "=" + paraObj[paraKey]);
                    else paraArr.push("&" + paraKey + "=" + paraObj[paraKey]);
                    rm_index += 1;
                }
                var tree = tpa.getWidget(internal.tpaId, 'Tree');
                tree.zTree.setting.async.url = '../rest/lar/itr?' + paraArr.join("");
                tree.zTree.reAsyncChildNodes(null, "refresh");
                base.emptyPanel(internal);
            },
            tree_Refresh: function() {
                base.tree_Refresh.call(this, internal);
            },
            expendTreeNode: function() {
                base.expendTreeNode.call(this);
            },
            //树节点 全部折叠
            collapseTreeNode: function() {
                base.collapseTreeNode.call(this);
            },
            download: function() {
                base.download.call(this, internal);
            },
            //上传文件，保存相关信息到数据库
            wordSave: function() {
                var tree = tpa.getWidget(this, 'Tree');
                var form = tpa.getWidget(this, 'Add_Word_Form');
                var publish_date = form.value.publish_date;
                var selectedItem = tree.zTree.getSelectedNodes()[0];
                var word_name;
                if (publish_date == "") {
                    common.showResultDialog({
                        'msg_info': '请输入正确的发布日期',
                        'msg_no': 1
                    });
                    return;
                }
                var fileList = tpa.getWidget(internal.tpaId, 'fileList');
                if (fileList.uploadFileLength() <= 0 || !internal._checkFileQalified(fileList)) {
                    common.showResultDialog({
                        'msg_info': '请选择word或者excel文件上传',
                        'msg_no': 1
                    });
                    return;
                }
                ioIframe.send({
                    method: "POST",
                    form: tpa.getWidget(internal.tpaId, 'previewForm').domNode,
                    url: "../rest/lar/wlr?wordType=internal",
                    load: function(response) {
                        var data = angular.fromJson(response);
                        if (data.msg_no == 1) {
                            var word_id = data.msg_info;
                            var node_value = tpa.getWidget(internal.tpaId, 'previewForm').domNode[0].value;
                            if (node_value != null) {
                                word_name = node_value.substring(node_value.lastIndexOf('\\') + 1, node_value.length);
                            }
                            var is_external = 1;
                            xhr("POST", {
                                url: '../rest/lar/wig?wordType=internal',
                                postData: {
                                    'word_id': dojo.toJson(word_id),
                                    'word_name': dojo.toJson(word_name),
                                    'is_external': dojo.toJson(is_external),
                                    'publisher': selectedItem.name,
                                    'value': dojo.toJson(form.value),
                                    'business_name': dojo.toJson(selectedItem.getParentNode().name),
                                    'menu_id': dojo.toJson(selectedItem.menu_id)
                                },
                                handleAs: "json",
                                load: function(data) {
                                    if (data.msg_no == 1) {
                                        common.showResultDialog({
                                            'msg_info': data.msg_info,
                                            'msg_no': 0
                                        });
                                        internal.word_id = word_id;
                                        var newItem = [{
                                            id: new uuid(generateTimeBasedUuid()).toString(),
                                            name: word_name.indexOf('.') > 0 ? word_name.substring(0, word_name.lastIndexOf('.')) : word_name,
                                            type: 'menu',
                                            typeinfo: 'internalWord',
                                            wordid: word_id,
                                            proof: form.value.proof,
                                            publisher: selectedItem.getParentNode().name,
                                            business_name: selectedItem.name,
                                            publish_date: form.value.publish_date,
                                            pid: selectedItem,
                                            attribute: 'children'
                                        }];
                                        tree.zTree.addNodes(selectedItem, newItem);
                                        if (selectedItem.children) {
                                            tree.zTree.expandNode(selectedItem, true, true);
                                            tree.zTree.selectNode(tree.zTree.getNodesByParam("id", newItem[0].id)[0]);
                                        }
                                        base.showWord(internal, word_id);
                                    } else {
                                        common.showResultDialog({
                                            'msg_info': data.msg_info,
                                            'msg_no': data.msg_no
                                        });
                                    }
                                },
                                error: function(resultdata, ioArgs) {
                                    common.showResultDialog({
                                        'msg_info': '保存失败',
                                        'msg_no': 1
                                    });
                                }
                            });
                        } else {
                            common.showResultDialog({
                                'msg_info': '保存失败',
                                'msg_no': 500
                            });
                        }

                    },
                    error: function(resultdata, ioArgs) {
                        common.showResultDialog({
                            'msg_info': '保存失败',
                            'msg_no': 1
                        });
                    }
                });
            },
            //删除树节点
            deleteNode: function() {
                if (confirm('确定要删除吗？')) {
                    var tree = tpa.getWidget(this, 'Tree');
                    var selectedItem = tree.zTree.getSelectedNodes()[0];
                    if (selectedItem == null) {
                        common.showResultDialog({
                            'msg_info': '请选中树节点',
                            'msg_no': 1
                        });
                        return;
                    }
                    if (selectedItem.typeinfo == 'totalCountNode' || selectedItem.typeinfo == 'internalNode') {
                        base.showOPInfo(internal, selectedItem, "删除");
                        return;
                    }
                    var url = '',
                        content = {};
                    if (selectedItem.typeinfo == 'internalRegulation') {
                        var regulation_id = selectedItem.regulationid;
                        internal.regulation_id = regulation_id;
                        url = '../rest/lar/eig';
                        content = { "regulation_id": regulation_id };
                        internal.deleteSave(url, content);
                    } else if (selectedItem.typeinfo == 'internalWord') {
                        var word_id = selectedItem.wordid;
                        var word_name = !!selectedItem.realname ? selectedItem.realname : selectedItem.name;
                        url = '../rest/lar/wig';
                        content = {
                            "word_id": word_id,
                            "word_name": word_name
                        };
                        internal.deleteSave(url, content);
                    }
                }
            },
            deleteSave: function(url, content) {
                xhr("DELETE", {
                    url: url,
                    content: content,
                    handleAs: "json",
                    handle: function(data) {
                        internal.deleteCallBack(data);
                    },
                    error: function(msg) {
                        common.showResultDialog({
                            'msg_info': data.msg_info,
                            'msg_no': data.msg_no
                        });
                    }
                });
            },
            deleteCallBack: function(data) {
                if (data.msg_no == 1) {
                    common.showResultDialog({
                        "msg_info": data.msg_info
                    });
                    var tree = tpa.getWidget(internal.tpaId, 'Tree');
                    var selectedItem = tree.zTree.getSelectedNodes()[0];
                    var parentItem = selectedItem.getParentNode() === null ? selectedItem : selectedItem.getParentNode();
                    tree.zTree.removeNode(selectedItem);
                    tree.zTree.selectNode(parentItem);
                    var rootNode = parentItem.getParentNode() === null ? parentItem : parentItem.getParentNode();
                    base.showWordList(internal, rootNode, parentItem.name);
                    var markName = parentItem.getParentNode() === null ? parentItem.children[0].name : parentItem.name;
                    base.setDefaultMark(internal, markName);
                } else {
                    common.showResultDialog({
                        'msg_info': data.msg_info,
                        'msg_no': data.msg_no
                    });
                }
            },
            //新增按钮
            add: function() {
                var tree = tpa.getWidget(this, 'Tree');
                var selectedItem = tree.zTree.getSelectedNodes()[0];
                if (selectedItem == null) {
                    common.showResultDialog({
                        'msg_info': '请选中树节点',
                        'msg_no': 1
                    });
                    return;
                }
                if (selectedItem.typeinfo == 'internalRegulation') {
                    common.showResultDialog({
                        'msg_info': '新增条款请选中相应文档',
                        'msg_no': 1
                    });
                    return;
                } else if (selectedItem.typeinfo == 'internalWord') {
                    var detailForm = tpa.getWidget(internal.tpaId, "Add_Regulation_Form");
                    var publisher = selectedItem.publisher;
                    detailForm.set('value', {
                        'regulation_name': '',
                        'proof': selectedItem.proof,
                        'publish_date': selectedItem.publish_date,
                        'publisher': publisher,
                        'regulation_content': '',
                        'remark': '',
                        'inportance': ''
                    });
                    common.selectOneFromPanelSet(this, 'PanelSet', 'AddPanel');
                } else if (selectedItem.typeinfo == 'internalSecondNode') {
                    var detailForm = tpa.getWidget(internal.tpaId, "Add_Word_Form");
                    detailForm.set('value', {
                        'proof': '',
                        'publish_date': '',
                        'publisher': selectedItem.name,
                        'business_name': tree.zTree.getSelectedNodes()[0].getParentNode().name,
                    });
                    tpa.getWidget(internal.tpaId, 'fileList').reset();
                    tpa.getWidget(internal.tpaId, 'uploader').reset();
                    common.selectOneFromPanelSet(this, 'PanelSet', 'UploadPanel');
                } else if (selectedItem.typeinfo == 'internalNode') {

                }
            },
            //新增二级节点
            savePublisher: function() {
                var self = this;
                var form = tpa.getWidget(this, 'addPublisherForm');
                if (form.value.publisher == '') {
                    common.showResultDialog({
                        'msg_info': '请把信息填写完整',
                        'msg_no': 1
                    });
                    return;
                }
                var tree = tpa.getWidget(this, 'Tree');
                var selectedItem = tree.zTree.getSelectedNodes()[0];
                var childrenList = selectedItem.children;
                if (selectedItem.children) {
                    for (var i = 0; i < childrenList.length; i++) {
                        if (childrenList[i].name == form.value.publisher) {
                            common.showResultDialog({
                                'msg_info': '该业务名称已存在',
                                'msg_no': 1
                            });
                            return;
                        }
                    }
                }
                xhr("POST", {
                    url: '../rest/lar/iig?action=addSecondRoot',
                    postData: {
                        'publisher': form.value.publisher,
                        'parent_menu_id': selectedItem.menu_id
                    },
                    handleAs: "json",
                    load: function(data) {
                        if (data.msg_no == 1) {
                            common.showResultDialog({
                                'msg_info': '保存成功',
                                'msg_no': 0
                            });
                            var newItemName = form.value.publisher;
                            var newItem = [{
                                id: new uuid(generateTimeBasedUuid()).toString(),
                                name: newItemName,
                                type: 'menu',
                                typeinfo: 'internalSecondNode',
                                menu_id: data.msg_info,
                                pid: selectedItem.id,
                                attribute: 'children'
                            }];
                            tree.zTree.addNodes(selectedItem, newItem);
                            base.showWordList(internal, selectedItem, newItemName);
                            base.setDefaultMark(internal, newItemName);
                            if (selectedItem.children) {
                                tree.zTree.expandNode(selectedItem, true, true);
                                tree.zTree.selectNode(tree.zTree.getNodesByParam("id", newItem[0].id)[0]);
                            }
                            internal.menu_id = data.msg_info;
                            base.showRegulation(internal, null);
                        } else {
                            common.showResultDialog({
                                'msg_info': data.msg_info,
                                'msg_no': data.msg_no
                            });
                        }
                    },
                    error: function(resultdata, ioArgs) {
                        common.showResultDialog({
                            'msg_info': '保存失败',
                            'msg_no': 1
                        });
                    }
                });
            },
            //编辑业务名称
            editPublisher: function() {
                var self = this;
                var tree = tpa.getWidget(this, 'Tree');
                var selectedItem = tree.zTree.getSelectedNodes()[0];
                var menu_id = selectedItem.menu_id;
                var detailForm = tpa.getWidget(internal.tpaId, "editPublisherForm");
                var menu_name = detailForm.value.publisher;
                var publisher = selectedItem.name;
                var nodes = tree.zTree.transformToArray(tree.zTree.getNodes());
                for (var m = 0; m < nodes.length; m++) {
                    if (nodes[m].name === menu_name) {
                        common.showResultDialog({
                            'msg_info': '该业务名称已存在',
                            'msg_no': 1
                        });
                        return;
                    }
                }
                xhr("PUT", {
                    url: '../rest/lar/iig?action=editPublisher&menu_id=' + menu_id + '&menu_name=' + menu_name + '&publisher=' + publisher,
                    handleAs: "json",
                    load: function(data) {
                        if (data.msg_no == 1) {
                            common.showResultDialog({
                                'msg_info': '修改成功',
                                'msg_no': 0
                            });
                            selectedItem.name = menu_name;
                            tree.zTree.updateNode(selectedItem);
                            base.showWordList(internal, selectedItem.getParentNode(), menu_name);
                            common.selectOneFromPanelSet(self, 'PanelSet', 'EmptyPanel');
                        } else {
                            common.showResultDialog({
                                'msg_info': data.msg_info,
                                'msg_no': data.msg_no
                            });
                        }
                    },
                    error: function(resultdata, ioArgs) {
                        common.showResultDialog({
                            'msg_info': '修改失败',
                            'msg_no': 1
                        });
                    }
                });
            },
            //编辑按钮
            edit: function() {
                var tree = tpa.getWidget(this, 'Tree');
                var selectedItem = tree.zTree.getSelectedNodes()[0];
                if (selectedItem == null) {
                    common.showResultDialog({
                        'msg_info': '请选中文档或者条款',
                        'msg_no': 1
                    });
                    return;
                }
                if (selectedItem.typeinfo == 'internalRegulation') {
                    var detailForm = tpa.getWidget(internal.tpaId, "Edit_Regulation_Form");
                    detailForm.clearFormData();
                    var regulation_id = selectedItem.regulationid;
                    xhr("GET", {
                        url: '../rest/lar/iig?action=getRegulationDetail&regulation_id=' + regulation_id,
                        handleAs: "json",
                        load: function(data) {
                            base.detail(detailForm, data);
                            internal.reg_name = data.regulation_name;
                            internal.reg_content = data.regulation_content;
                            internal.remark = data.remark;
                            internal.inportance = data.inportance;
                            internal.word_id = data.word_id;
                        }

                    });
                    common.selectOneFromPanelSet(this, 'PanelSet', 'EditPanel');
                } else if (selectedItem.typeinfo == 'internalWord') {
                    var detailForm = tpa.getWidget(internal.tpaId, "Edit_Word_Form");
                    detailForm.clearFormData();
                    var word_id = selectedItem.wordid;
                    xhr("GET", {
                        url: '../rest/lar/wig?action=WordDetail&word_id=' + word_id,
                        handleAs: "json",
                        load: function(data) {
                            detailForm.set('value', {
                                'word_name': data.word_name != null ? data.word_name.substring(0, data.word_name.lastIndexOf('.')) : '',
                                'proof': data.proof,
                                'publish_date': data.publish_date,
                                'business_name': data.business_name,
                                'publisher': data.publisher
                            });
                            internal.word_name = data.word_name;
                            internal.proof = data.proof;
                            internal.publish_date = data.publish_date;
                            internal.type = data.word_name.substring(data.word_name.lastIndexOf('.'), data.word_name.length);
                        }
                    });
                    common.selectOneFromPanelSet(this, 'PanelSet', 'editUploadPanel');
                }
            },
            //保存条款
            save: function() {
                var form = tpa.getWidget(this, 'Add_Regulation_Form');
                var regultionData = form.value;
                regultionData.inportance = "0";
                if (regultionData.regulation_content == '' || regultionData.regulation_name == '' || regultionData.inportance == '') {
                    common.showResultDialog({
                        'msg_info': '请把信息填写完整',
                        'msg_no': 1
                    });
                    return;
                }
                var tree = tpa.getWidget(this, 'Tree');
                var selectedItem = tree.zTree.getSelectedNodes()[0];
                xhr("POST", {
                    url: '../rest/lar/eig',
                    postData: {
                        'word_id': dojo.toJson(selectedItem.wordid),
                        'value': dojo.toJson(regultionData)
                    },
                    handleAs: "json",
                    load: function(data) {
                        if (data.msg_no == 1) {
                            common.showResultDialog({
                                'msg_info': '保存成功',
                                'msg_no': 0
                            });
                            var newItem = [{
                                id: new uuid(generateTimeBasedUuid()).toString(),
                                name: form.value.regulation_name,
                                type: selectedItem.type,
                                typeinfo: 'internalRegulation',
                                regulationid: data.msg_info,
                                pid: selectedItem.id,
                                attribute: 'children'
                            }];
                            tree.zTree.addNodes(selectedItem, newItem);
                            if (selectedItem.children) {
                                tree.zTree.expandNode(selectedItem, true, true);
                                tree.zTree.selectNode(tree.zTree.getNodesByParam("id", newItem[0].id)[0]);
                            }
                            internal.regulation_id = data.msg_info;
                            base.showRegulation(internal, internal.regulation_id);
                        } else {
                            common.showResultDialog({
                                'msg_info': data.msg_info,
                                'msg_no': data.msg_no
                            });
                        }
                    },
                    error: function(resultdata, ioArgs) {
                        common.showResultDialog({
                            'msg_info': '保存失败',
                            'msg_no': 1
                        });
                    }
                });
            },
            //修改文档
            modify_word: function() {
                var form = tpa.getWidget(this, 'Edit_Word_Form');
                if (form.value.word_name == '' || form.value.proof == '') {
                    common.showResultDialog({
                        'msg_info': '请把信息填写完整',
                        'msg_no': 1
                    });
                    return;
                } else if (form.value.publish_date == "") {
                    common.showResultDialog({
                        'msg_info': '请输入正确的发布日期',
                        'msg_no': 1
                    });
                    return;
                }
                var word_name = form.value.word_name + internal.type;
                if (word_name == internal.word_name && form.value.proof == internal.proof &&
                    form.value.publish_date == internal.publish_date) {
                    common.showResultDialog({
                        'msg_info': '文档信息未作修改',
                        'msg_no': 1
                    });
                    return;
                }
                var tree = tpa.getWidget(this, 'Tree');
                var selectedItem = tree.zTree.getSelectedNodes()[0];
                xhr("PUT", {
                    url: '../rest/lar/wig',
                    postData: {
                        'word_id': selectedItem.wordid,
                        'word_name': internal.word_name,
                        'word_type': internal.type,
                        'publisher': internal.publisher,
                        'business_name': selectedItem.getParentNode().name,
                        'value': dojo.toJson(form.value),
                        'is_external': 1
                    },
                    handleAs: "json",
                    load: function(data) {
                        if (data.msg_no == 1) {
                            common.showResultDialog({
                                'msg_info': '保存成功',
                                'msg_no': 0
                            });
                            //tree.model.store.setValue(selectedItem, 'name', form.value.word_name);
                            selectedItem.name = form.value.word_name;
                            tree.zTree.updateNode(selectedItem);
                            base.showWordList(internal, selectedItem.getParentNode(), form.value.word_name);
                            internal.word_id = selectedItem.wordid;
                            base.showWord(internal, internal.word_id);
                        } else {
                            common.showResultDialog({
                                'msg_info': data.msg_info,
                                'msg_no': data.msg_no
                            });
                        }
                    },
                    error: function(resultdata, ioArgs) {
                        common.showResultDialog({
                            'msg_info': '保存失败',
                            'msg_no': 1
                        });
                    }
                });
            },
            modify_regulation: function() {
                base.modify_regulation.call(this, internal);
            },
            add_businessname_btn: function() {
                base._hiddenMenu(internal.tpaId);
                var tree = tpa.getWidget(this, 'Tree');
                var selectedItem = tree.zTree.getSelectedNodes()[0];
                var detailForm = tpa.getWidget(internal.tpaId, "addBusinessForm");
                detailForm.set('value', {
                    'business_name': '',
                    'parent_menu_name': selectedItem.name
                });
                common.selectOneFromPanelSet(this, 'PanelSet', 'AddBusinessname');

            },
            saveBusinessname: function() {
                var self = this;
                var form = tpa.getWidget(this, 'addBusinessForm');
                if (form.value.business_name == '') {
                    common.showResultDialog({
                        'msg_info': '请把信息填写完整',
                        'msg_no': 1
                    });
                    return;
                }
                var tree = tpa.getWidget(this, 'Tree');
                var selectedItem = tree.zTree.getSelectedNodes();
                if (tree.zTree.getNodes()) {
                    for (var i = 0; i < tree.zTree.getNodes().length; i++) {
                        if (tree.zTree.getNodes()[i].name == form.value.business_name) {
                            common.showResultDialog({
                                'msg_info': '该部门名称已存在,请重新输入',
                                'msg_no': 1
                            });
                            return;
                        }
                    }
                }
                common.selectOneFromPanelSet(this, 'PanelSet', 'emptyArea');
                xhr("POST", {
                    url: '../rest/lar/iig?action=addRoot&business_name=' + form.value.business_name,
                    handleAs: "json",
                    load: function(data) {
                        if (data.msg_no == 1) {
                            common.showResultDialog({
                                'msg_info': '保存成功',
                                'msg_no': 0
                            });
                            var newItemName = form.value.business_name;
                            var newItem = [{
                                id: new uuid(generateTimeBasedUuid()).toString(),
                                name: newItemName,
                                type: 'root',
                                typeinfo: 'internalNode',
                                menu_id: data.msg_info,
                                pid: selectedItem.id,
                                attribute: 'root'
                            }];
                            internal.tree_Refresh();
                            //tree.zTree.selectNode(tree.zTree.getNodesByParam("id", newItem[0].id)[0]);
                            //tree.zTree.addNodes(selectedItem, newItem);
                            base.showWordList(internal, selectedItem, newItemName);
                            base.setDefaultMark(internal, newItemName);
                            if (selectedItem.children) {
                                tree.zTree.expandNode(selectedItem, true, true);
                                tree.zTree.selectNode(tree.zTree.getNodesByParam("id", newItem[0].id)[0]);
                            }
                            internal.menu_id = data.msg_info;
                            base.showRegulation(internal, null);
                        } else {
                            common.showResultDialog({
                                'msg_info': data.msg_info,
                                'msg_no': data.msg_no
                            });
                        }
                    },
                    error: function(resultdata, ioArgs) {
                        common.showResultDialog({
                            'msg_info': '保存失败',
                            'msg_no': 1
                        });
                    }
                });
            },
            edit_businessname_btn: function() {
                base._hiddenMenu(internal.tpaId);
                var tree = tpa.getWidget(this, 'Tree');
                if (tree.zTree.getSelectedNodes().length > 0) {
                    var selectedItem = tree.zTree.getSelectedNodes()[0];
                    var detailForm = tpa.getWidget(internal.tpaId, "editRootForm");
                    detailForm.clearFormData();
                    var menu_name = selectedItem.name;
                    detailForm.set('value', {
                        'business_name': menu_name
                    });
                    common.selectOneFromPanelSet(this, 'PanelSet', 'editRootName');
                }

            },

            editBusiness: function() {
                var self = this;
                var tree = tpa.getWidget(this, 'Tree');
                var selectedItem = tree.zTree.getSelectedNodes()[0];
                var menu_id = selectedItem.menu_id;
                var detailForm = tpa.getWidget(internal.tpaId, "editRootForm");
                var menu_name = detailForm.value.business_name;
                var business_name = selectedItem.name;
                if (tree.zTree.getNodes()) {
                    for (var i = 0; i < tree.zTree.getNodes().length; i++) {
                        if (tree.zTree.getNodes()[i].name == detailForm.value.business_name) {
                            common.showResultDialog({
                                'msg_info': '该业务名称已存在,请重新输入',
                                'msg_no': 1
                            });
                            return;
                        }
                    }
                }
                xhr("PUT", {
                    url: '../rest/lar/iig?action=editBusinessname&menu_id=' + menu_id + '&menu_name=' + menu_name + '&business_name=' + business_name,
                    handleAs: "json",
                    load: function(data) {
                        if (data.msg_no == 1) {
                            common.showResultDialog({
                                'msg_info': '修改成功',
                                'msg_no': 0
                            });
                            internal.tree_Refresh();
                            selectedItem.name = menu_name;
                            tree.zTree.updateNode(selectedItem);
                            //base.showWordList(reportManagement, selectedItem.getParentNode(), menu_name);
                            //tree.zTree.selectNode(tree.zTree.getNodesByParam("menu_id", menu_id)[0]);
                            common.selectOneFromPanelSet(self, 'PanelSet', 'EmptyPanel');
                        } else {
                            common.showResultDialog({
                                'msg_info': data.msg_info,
                                'msg_no': data.msg_no
                            });
                        }
                    },
                    error: function(resultdata, ioArgs) {
                        common.showResultDialog({
                            'msg_info': '修改失败',
                            'msg_no': 1
                        });
                    }
                });
            },
            deleteRoot: function() {
                base._hiddenMenu(internal.tpaId);
                if (confirm('确定要删除吗？')) {
                    var tree = tpa.getWidget(this, 'Tree');
                    var selectedItem = tree.zTree.getSelectedNodes()[0];
                    if (selectedItem == null) {
                        common.showResultDialog({
                            'msg_info': '请选中树节点',
                            'msg_no': 1
                        });
                        return;
                    }
                    if (!selectedItem.children || selectedItem.children.length < 1) {
                        var menu_id = selectedItem.menu_id;
                        url = '../rest/lar/iig';
                        content = { "menu_id": menu_id };
                        internal.deleteSave(url, content);
                    } else {
                        common.showResultDialog({
                            'msg_info': '该业务下有文档，请确认没有文档再删除',
                            'msg_no': 500
                        });
                    }
                }
            },

            add_publisher_btn: function() {
                base._hiddenMenu(internal.tpaId);
                var tree = tpa.getWidget(this, 'Tree');
                var selectedItem = tree.zTree.getSelectedNodes()[0];
                var detailForm = tpa.getWidget(internal.tpaId, "addPublisherForm");
                detailForm.set('value', {
                    'business_name': '',
                    'parent_menu_name': selectedItem.name
                });
                common.selectOneFromPanelSet(this, 'PanelSet', 'AddPublisher');
            },
            edit_publisher_btn: function() {
                base._hiddenMenu(internal.tpaId);
                var tree = tpa.getWidget(this, 'Tree');
                var selectedItem = tree.zTree.getSelectedNodes()[0];
                var detailForm = tpa.getWidget(internal.tpaId, "editPublisherForm");
                detailForm.clearFormData();
                var menu_name = selectedItem.name;
                detailForm.set('value', {
                    'publisher': menu_name
                });
                common.selectOneFromPanelSet(this, 'PanelSet', 'editPublisher');
            },

            addPublisher: function() {
                var select = tpa.getWidget(functionListExport.tpaId, 'addPublisher');
                if (!select) {
                    var select = new TreeMixinSelect({
                        isZTree: true,
                        dropDownArgs: {
                            url: '../rest/lar/iig?action=getPublisher',
                            showRoot: true,
                            expandAll: true,
                            ctype: 'radio'
                        }
                    }, functionListExport.tpaId + '-addPublisher');
                    select.startup();
                }
            },
            _checkFileQalified: function(fileList) {
                var uploader = tpa.getWidget(internal.tpaId, 'uploader');
                var uploadType = uploader.params.uploadType;
                if (!fileList.validateUpload(uploadType)) {
                    var msg = uploader.params.msgInfo.fileTypeMsg + ',请上传' + uploadType + '格式文件!'
                    common.showWarningDialog(msg);
                    return false;
                }
                return true;
            }
        });
        return internal;
    });