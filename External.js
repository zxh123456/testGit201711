define([//
	"dojo/_base/lang", //
	"dojo/dom-construct",
	"dojo/_base/array", //
	"dojo/dom-attr", //
	"dojo/dom-class", //
	"dojo/keys", //
	"athena/dojo/templateAction/Base", //
	"athena/dojo/templateAction/Commonx", //
	"dojox/uuid/Uuid", //
	"dojox/uuid/generateTimeBasedUuid", //
	"athena/dojo/templateAction/TAVertical", //
	"athena/dojo/templateAction/TATree", //
	"dojo/_base/xhr", //
	"dojo/json", //
	"dojo/on",
	"athena/dojo/data/util/transaction", //
	"athena/gridx/Grid", //
	"dojo/store/Memory", "dojo/io/iframe",
	"athena/dijit/ZTree", //
	"athena/business/lar/Base"
], //
function(lang, domConstruct, array, domAttr, domClass, keys, tpa, common, uuid, generateTimeBasedUuid, TAVertical, TATree, xhr, json, on, transaction, Grid, Memory, ioIframe, ZTree, base) {
	//注册External
	var external = tpa.register('lar.external');
	lang.mixin(external, {
		onLoad : function(id) {
			external.pageName = "external";
			external.url = '../rest/lar/etr?action=date';
			base.onLoad.call(this, external, id);
			dojo.connect(dojo.byId(id + "-externalSearchBtn"),"onclick",external.searchWord);
			on(dojo.byId(id + "-externalSearch"), "onkeypress", external.searchWordEnter);
			on(dojo.byId(id + "-externalProofSearch"), "onkeypress", external.searchWordEnter);
			dojo.connect(dojo.byId(id + "-fieldLabel"),"onclick",external.searchField);
			dojo.connect(dojo.byId(id+"-searchRestBtn"),"onclick",external.restSearchForm)
			external.topTopOrBottom();
		},
		//回到顶部
		topTopOrBottom : function(){
			base.topTopOrBottom.call(this,"#"+external.tpaId+"-downloadPanel","#"+external.tpaId+"-rightTip");
		},
		//重置表单
		restSearchForm : function(){
			base.restSearchForm.call(this,external.tpaId, external.tpaId+'-external_search_Form');
			var publishers = dojo.query("li.selected",external.tpaId+"-publisherList");
			dojo.forEach(publishers, function(publisher, index){
				domClass.remove(publisher, "selected");
			});
			var checkAllObj = dojo.query("i", external.tpaId +"-selectAll")[0];
			if(domClass.contains(checkAllObj, "fa-check-sign")){
				domClass.remove(checkAllObj, "fa-check-sign");
				domClass.add(checkAllObj, "fa-check-empty");
			}
			dojo.byId(external.tpaId +"-selectedNum").innerHTML = 0;
		},
		//搜索域操作
		searchField : function(){
			base.searchField.call(this,external.tpaId+"-external_searchPanel");
		},
		//返回
		returnBack : function(){
			base.returnBack.call(this, external);
		},
		//搜索
		searchWordEnter : function(e){
			if(e.keyCode == keys.ENTER) {
				external.searchWord();
			}
		},
		searchWord : function(){
			var searchWord = dojo.byId(external.tpaId + "-externalSearch").value.trim();
			var proof = dojo.byId(external.tpaId + "-externalProofSearch").value.trim();
			var title = dojo.byId(external.tpaId + "-external_title").checked;
			var regulation = dojo.byId(external.tpaId + "-external_content").checked;
			var startDateObj = tpa.getWidget(external.tpaId, 'startDate');
			var startDate = startDateObj.displayedValue;
			var endDateObj = tpa.getWidget(external.tpaId, 'endDate');
			var endDate = endDateObj.displayedValue;
			var publishers = dojo.query("li.selected",external.tpaId+"-publisherList");
			var publisherArr = dojo.map(publishers, function(publisher, index){
				return publisher.innerText;
			});
			if((startDateObj.state == "Error" && startDate != "起始日期") || (endDateObj.state == "Error" && endDate != "截止日期")){
				common.showResultDialog({
					'msg_info' : "提示：您输入的日期不合法",
					'msg_no' : "1"
				});
				return;
			}
			startDate = startDate == "起始日期" ? "" : startDate;
			endDate = endDate == "截止日期" ? "" : endDate;
			if(startDate != "" && endDate != ""){
				if(new Date(startDate).getTime() > new Date(endDate).getTime()){
					common.showResultDialog({
						'msg_info' : "提示：搜索的起始日期不能大于截止日期",
						'msg_no' : "1"
					});
					return;
				}
			}
			if(searchWord == "" && proof == "" && startDate == "" && endDate == "" && publisherArr.length < 1){
				if(!external.searchState){
					common.showResultDialog({
						'msg_info' : "提示：请先输入查询条件",
						'msg_no' : "1"
					});
					external.searchState = false;
					return;
				}
				external.searchState = false;
			}else{
				external.searchState = true;
			}
			if((searchWord != "") && (!regulation && !title)){
				common.showResultDialog({
					'msg_info' : "提示：请先设置搜索域",
					'msg_no' : "1"
				});
				return;
			}
			var containerWrap = dojo.byId(external.tpaId+"-containerWrap");
			base.showLoading(containerWrap);
			external.keyWord = searchWord;
			var paraArr = [];
			var paraObj = {"proof":proof,"title":title,"regulation":regulation,"searchWord":searchWord,"publisher":publisherArr,"startDate":startDate,"endDate":endDate};
			for(var paraKey in paraObj){
				paraArr.push("&"+ paraKey +"=" + paraObj[paraKey]);
			}
			external.searchType(external.treeType, paraArr);
		},
		//更换分类方式
		_change_tree : function(){
			var sortType = this.type;
			if(sortType == external.treeType){
				var promptMes = {"date":"日期","keyWord":"标签"};
				common.showResultDialog({
					'msg_info' : '提示：当前归类方式正是'+ promptMes[this.type] +"归类",
					'msg_no' : 1
				});
				return;
			}
			external.searchState = false;
			var containerWrap = dojo.byId(external.tpaId+"-containerWrap");
			base.showLoading(containerWrap);
			external.treeType = this.type;//树类型
			external.searchType(sortType);
		},
		//分类搜索
		searchType: function(sortType, searchLabel) {
			var tree = tpa.getWidget(external.tpaId, 'Tree');
			dojo.xhrGet({
            	url: "../pages/lar/data/label_names.json",
                handleAs: "json",
                load: function(data) {
                	dojo.forEach(data.items, function(item, index){
                		delete item.uuid;
                		delete item.label;
                	});
                	var labelJson = JSON.stringify(data);
                	if(external.searchState && searchLabel) {
                		labelJson = labelJson + searchLabel.join("");
                	}
                	tree.zTree.setting.async.url = "../rest/lar/etr?action=" + sortType +"&labelJson="+labelJson;
                	external.reAsyncChildNodes = true;
                	tree.zTree.reAsyncChildNodes(null, "refresh");
                	base.emptyPanel(external);
                },
                error: function(error){
                	console.log("错误"+error);
                }
            });
		},
		//刷新树
		tree_Refresh : function() {
			base.tree_Refresh.call(this, external);
		},
		//树节点 全部展开
		expendTreeNode : function() {
			base.expendTreeNode.call(this);
		},
		//树节点 全部折叠
		collapseTreeNode : function() {
			base.collapseTreeNode.call(this);
		},
		download: function() {
			base.download.call(this, external);
		},
		/* 以下代码是新增、修改、删除的老代码，暂时注释，
		   后续功能开发后可借鉴这部分代码
		*/
		//上传文件，保存相关信息
		// wordSave : function() {
		// 	var tree = tpa.getWidget(this, 'Tree');
		// 	var self = this;
		// 	var form = tpa.getWidget(this, 'Add_Word_Form');
		// 	var publish_date = form.value.publish_date;
		// 	var selectedItem = tree.selectedItem;
		// 	var label_ids = tpa.getWidget(external.tpaId,"labelNameSet").selectIds;
		// 	var word_name;
		// 	var publisher;
		// 	if(selectedItem.typeinfo == 'externalDate' || selectedItem.typeinfo == 'externalLabel'){
		// 		publisher = selectedItem.publisher[0];
		// 	} else {
		// 		publisher = selectedItem.name[0]; 
		// 	}
			
		// 	if(publish_date == "" || (label_ids && label_ids.length == 0)) {
		// 		common.showResultDialog({
		// 			'msg_info' : '抱歉：请先完善表单信息',
		// 			'msg_no' : 1
		// 		});
		// 		return;
		// 	}
		// 	ioIframe.send({
		// 		method : "POST",
		// 		form : tpa.getWidget(external.tpaId, 'previewForm').domNode,
		// 		url : "../rest/lar/wlr?wordType=external&publisher="+publisher,
		// 		load : function(response) {
		// 			var data = angular.fromJson(response);
		// 			if(data.msg_no == 1) {
		// 				var word_id = data.msg_info;
		// 				var node_value = tpa.getWidget(external.tpaId, 'previewForm').domNode[0].value;
		// 				if (node_value != null) {
		// 					word_name = node_value.substring(node_value.lastIndexOf('\\')+1, node_value.length);
		// 				}
		// 				var is_external = 0;
		// 				if(label_ids.length > 0)
		// 					form.value.label_name = label_ids.toString();
		// 				xhr("POST", {
		// 					url : '../rest/lar/wig?wordType=external',
		// 					postData : {
		// 						'word_id' : dojo.toJson(word_id),
		// 						'word_name' : dojo.toJson(word_name),
		// 						'is_external' : dojo.toJson(is_external),
		// 						'publisher' : dojo.toJson(publisher),
		// 						'value' : dojo.toJson(form.value)
		// 					},
		// 					handleAs : "json",
		// 					load : function(data) {
		// 						if(data.msg_no == 1) {
		// 							common.showResultDialog({
		// 								'msg_info' : data.msg_info,
		// 								'msg_no' : 0
		// 							});
									
		// 							var word_name_notype =  word_name.lastIndexOf(".") > 0 ? word_name.substring(0,word_name.lastIndexOf(".")) : word_name;
		// 							external.word_id = word_id;
		// 							var selectedNode = tree.selectedNode;
		// 							if (selectedItem.typeinfo == 'externalDate' || external.treeType == 'date'){
		// 								var publish_date = form.value.publish_date;
		// 								var publish_year = parseInt(("" + publish_date).substring(0,4));
		// 								var publisher_node = selectedItem.typeinfo == 'externalDate'? selectedNode.getParent().item : selectedItem;
		// 								var dateNodes = publisher_node.children;
		// 								var parentNode = dojo.filter(dateNodes,function(item,index){
		// 									if(publish_year == item.name){
		// 										return item;
		// 									}
		// 								});
		// 								if(!parentNode || parentNode.length == 0){
		// 									var moreInfo = {};
		// 									var parent = tree.model.store._getItemByIdentity(publisher_node.id);
		// 									var newItemObj = external.getBaseItem(publish_year, 'menu', 'externalDate', publisher, parent);
		// 									parentNode = tree.model.store.newItem(dojo.mixin(newItemObj.baseInfo, moreInfo) ,newItemObj.parentInfo);
		// 								}
		// 								parentNode = parentNode instanceof Array ? parentNode[0] : parentNode;
										
		// 								var moreInfo = {proof : form.value.proof, wordid : word_id, publish_date : publish_date};
		// 								var newItemObj = external.getBaseItem(word_name_notype, 'menu', 'externalWord', publisher, parentNode);
		// 								tree.model.store.newItem(dojo.mixin(newItemObj.baseInfo, moreInfo) ,newItemObj.parentInfo);
		// 		                        if (selectedItem.children) {
		// 		                        	tree._expandNode(tree.getNodesByItem(parentNode)[0]);
		// 		                        	tree._expandNode(tree.getNodesByItem(selectedItem)[0]);
		// 		                        	tree.dndController.setSelection(tree.getNodesByItem(parentNode.children[parentNode.children.length-1]));
		// 		                        }
		// 							} else if(selectedItem.typeinfo == 'externalLabel' || external.treeType == 'keyWord'){
		// 								var labelName = tpa.getWidget(external.tpaId,"labelNameSet").selectNames;
		// 								var selectIds = tpa.getWidget(external.tpaId,"labelNameSet").selectIds;
		// 								var publisher_node = selectedItem.typeinfo == 'externalLabel'? selectedNode.getParent().item : selectedItem;
		// 								var dateNodes = publisher_node.children;
		// 								for(var i =0;i<labelName.length;i++){
		// 									var parentNode = dojo.filter(dateNodes,function(item,index){
		// 										if(labelName[i] == item.name){
		// 											return item;
		// 										}
		// 									});
		// 									if(!parentNode || parentNode.length == 0){
		// 										var moreInfo = {label_name_id : selectIds[i]};
		// 										var parent = tree.model.store._getItemByIdentity(publisher_node.id);
		// 										var newItemObj = external.getBaseItem(labelName[i], 'menu', 'externalLabel', publisher, parent);
		// 										parentNode = tree.model.store.newItem(dojo.mixin(newItemObj.baseInfo, moreInfo) ,newItemObj.parentInfo);
		// 									}
		// 									parentNode = parentNode instanceof Array ? parentNode[0] : parentNode;
					                        
		// 									var moreInfo = {wordid : word_id, proof : form.value.proof, publish_date : form.value.publish_date};
		// 									var newItemObj = external.getBaseItem(word_name_notype, 'menu', 'externalWord', publisher, parentNode);
		// 									tree.model.store.newItem(dojo.mixin(newItemObj.baseInfo, moreInfo) ,newItemObj.parentInfo);
		// 			                        if (selectedItem.children) {
		// 			                        	tree._expandNode(tree.getNodesByItem(parentNode)[0]);
		// 			                        	tree._expandNode(tree.getNodesByItem(selectedItem)[0]);
		// 			                        	tree.dndController.setSelection(tree.getNodesByItem(parentNode.children[parentNode.children.length-1]));
		// 			                        }
		// 								}
		// 							}
		// 	                        external.showWord(external.word_id);
		// 						} else {
		// 							common.showResultDialog({
		// 								'msg_info' : data.msg_info,
		// 								'msg_no' : data.msg_no
		// 							});
		// 						}
		// 					},
		// 					error : function(resultdata, ioArgs) {
		// 						common.showResultDialog({
		// 							'msg_info' : '保存失败',
		// 							'msg_no' : 1
		// 						});
		// 					}
		// 				});
		// 			} else {
		// 				common.showResultDialog({
		// 					'msg_info' : '保存失败',
		// 					'msg_no' : 500
		// 				});
		// 			}
		// 		},
		// 		error : function(resultdata, ioArgs) {
		// 			common.showResultDialog({
		// 				'msg_info' : '保存失败',
		// 				'msg_no' : 1
		// 			});
		// 		}
		// 	});
		// },
		// //删除节点
		// deleteNode : function() {
		//     if (confirm('确定要删除吗？')) {
		//         var self = this;
		// 		var tree = tpa.getWidget(this, 'Tree');
		// 		var selectedItem = tree.selectedItem;
		// 		if(selectedItem == null) {
		// 			common.showResultDialog({
		// 				'msg_info' : '请选中树节点',
		// 				'msg_no' : 1
		// 			});
		// 			return;
		// 		}
		// 		if(selectedItem.typeinfo == 'externalRegulation') {
		// 			var regulation_id = selectedItem.regulationid;
		// 			external.regulation_id = regulation_id;
		// 			xhr("DELETE", {
		// 				url: '../rest/lar/eig',
		// 				content: {
		// 					"regulation_id": regulation_id
		// 				},
		// 				handleAs: "json",
		// 				handle: function(data) {
		// 					if (data.msg_no == 1) {
		// 						common.showResultDialog({
		// 							"msg_info": data.msg_info
		// 						});
		// 						if(external.treeType == 'keyWord'){
		// 							var old_regulation_name = selectedItem.name[0];
		// 							var word_name = tree.selectedNode.getParent().item;
		// 							var item = tree.getChildren()[0].item;
		// 							var root_arr = item.children;
		// 							for (var i=0; i<root_arr.length; i++) {
		// 								if (root_arr[i].children && root_arr[i].children.length > 0 && root_arr[i].name[0] == external.publisher) {
		// 									var root_item = root_arr[i];
		// 									var second_node_arr = root_item.children;
		// 									for(var m=0; m<second_node_arr.length; m++){
		// 										if(second_node_arr[m].children && second_node_arr[m].children.length > 0){
		// 											var word_arr = second_node_arr[m].children;
		// 											for(var y=0;y<word_arr.length;y++){
		// 												if(word_arr[y].children && word_arr[y].children.length>0 &&  word_arr[y].name[0] == word_name.name[0] ){
		// 													var secondItem = word_arr[y].children;
		// 													for(var n=0;n<secondItem.length;n++){
		// 														if(secondItem[n].name[0] == old_regulation_name){
		// 															tree.model.store.deleteItem(secondItem[n]);
		// 														}
		// 													}
		// 												}
		// 											}
		// 										}
		// 									}
		// 									break;
		// 								}
		// 							}
		// 						} else {
		// 							tree.model.store.deleteItem(selectedItem);
		// 						}
								
		// 					} else {
		// 						common.showResultDialog({
		// 							'msg_info' : data.msg_info,
		// 							'msg_no' : data.msg_no
		// 						});
		// 					}
		// 				},
		// 				error: function(data) {
		// 					common.showResultDialog({
		// 						'msg_info' : data.msg_info,
		// 						'msg_no' : data.msg_no
		// 					});
		// 				}
		// 			});
		// 		} else if(selectedItem.typeinfo == 'externalWord') {
		// 			var word_id = selectedItem.wordid;
		// 			var word_name = !!selectedItem.realname ? selectedItem.realname : selectedItem.name;
		// 			xhr("DELETE", {
		// 				url: '../rest/lar/wig',
		// 				content: {
		// 					"word_id": word_id,
		// 					"word_name": word_name
		// 				},
		// 				handleAs: "json",
		// 				handle: function(data) {
		// 					if (data.msg_no == 1) {
		// 						common.showResultDialog({
		// 							"msg_info": data.msg_info
		// 						});
		// 						var selectedParentItem = tree.selectedNode.getParent().item;
		// 						if(selectedParentItem.typeinfo == 'externalLabel'){
		// 							var label_ids = external.label_name;
		// 							var label_ids_arr = label_ids.split(",");
		// 							var item = tree.getChildren()[0].item;
		// 							var root_arr = item.children;
		// 							for (var i=0; i<root_arr.length; i++) {
		// 								if (root_arr[i].children && root_arr[i].children.length > 0 && root_arr[i].name[0] == external.publisher) {
		// 									var root_item = root_arr[i];
		// 									var second_node_arr = root_item.children;
		// 									for(var m=0; m<second_node_arr.length; m++){
		// 										for(var n=0;n<label_ids_arr.length;n++){
		// 											if(second_node_arr[m].children && second_node_arr[m].children.length > 0 && second_node_arr[m].label_name_id[0] == label_ids_arr[n]){
		// 												var word_arr = second_node_arr[m].children;
		// 												for(var y=0;y<word_arr.length;y++){
		// 													if(word_arr[y].name[0] == selectedItem.name){
		// 														var secondItem = word_arr[y];
		// 														tree.model.store.deleteItem(secondItem);
		// 														if( !second_node_arr[m].children){
		// 															tree.model.store.deleteItem(second_node_arr[m]);
		// 														}
		// 													}
		// 												}
		// 											}
		// 										}
		// 									}
		// 									break;
		// 								}
		// 							}
		// 						} else {
		// 							var parentChildren = selectedParentItem.children;
		// 							tree.model.store.deleteItem(selectedItem);
		// 							if(!parentChildren || parentChildren.length == 1){
		// 								tree.model.store.deleteItem(selectedParentItem);
		// 							}
		// 						}
		// 						common.selectOneFromPanelSet(self, 'PanelSet', 'EmptyPanel');
		// 					} else {
		// 					common.showResultDialog({
		// 					'msg_info' : data.msg_info,
		// 					'msg_no' : data.msg_no
		// 				});
		// 					}
		// 				},
		// 				error: function(data) {
		// 					common.showResultDialog({
		// 					'msg_info' : data.msg_info,
		// 					'msg_no' : data.msg_no
		// 				});
		// 				}
		// 			});
		// 		}else{
		// 			external.showOPInfo(selectedItem, "删除");
		// 		}
		//     }
		// },
  //       //新增按钮
		// add : function() {
		// 	var tree = tpa.getWidget(this, 'Tree');
		// 	var selectedItem = tree.selectedItem;
		// 	if(selectedItem == null) {
		// 		common.showResultDialog({
		// 			'msg_info' : '请选中树节点',
		// 			'msg_no' : 1
		// 		});
		// 		return;
		// 	}
		// 	if(selectedItem.typeinfo == 'externalRegulation') {
		// 		common.showResultDialog({
		// 			'msg_info' : '新增条款请选中相应文档',
		// 			'msg_no' : 1
		// 		});
		// 		return;
		// 	}else if(selectedItem.typeinfo == 'externalWord') {
		// 		var detailForm = tpa.getWidget(external.tpaId, "Add_Regulation_Form");
		// 		detailForm.clearFormData();
		// 		detailForm.set('value',selectedItem);
		// 		common.selectOneFromPanelSet(this, 'PanelSet', 'AddPanel');
		// 	} else{
		// 		if(selectedItem.typeinfo == 'externalNode' || selectedItem.typeinfo == 'externalDate' ) {
		// 			var selectedName = selectedItem.typeinfo == 'externalDate' ? selectedItem.publisher : selectedItem.name;
		// 			external.openUploadPanel(selectedName);
		// 		} else if(selectedItem.typeinfo == 'externalLabel'){
		// 			external.openUploadPanel(selectedItem.publisher);
		// 		}
		// 	}
		// },
		// //
		// openUploadPanel : function(publisher){
		// 	var detailForm = tpa.getWidget(external.tpaId, "Add_Word_Form");
		// 	detailForm.clearFormData();
		// 	detailForm.set('value', {'publisher' : publisher});
		// 	tpa.getWidget(external.tpaId, 'fileList').reset();
		// 	tpa.getWidget(external.tpaId, 'uploader').reset();
		// 	common.selectOneFromPanelSet(external.tpaId, 'PanelSet', 'UploadPanel');
		// },
		// //编辑按钮
		// edit : function() {
		// 	var tree = tpa.getWidget(this, 'Tree');
		// 	var selectedItem = tree.selectedItem;
		// 	if(selectedItem == null) {
		// 		common.showResultDialog({
		// 			'msg_info' : '请选中文档或者条款',
		// 			'msg_no' : 1
		// 		});
		// 		return;
		// 	}
		// 	if(selectedItem.typeinfo == 'externalRegulation') {
		// 		var detailForm = tpa.getWidget(external.tpaId, "Edit_Regulation_Form");
		// 		detailForm.clearFormData();
		// 		var regulation_id = selectedItem.regulationid[0];
		// 		xhr("GET", {
		// 			url : '../rest/lar/eig?regulation_id=' + regulation_id,
		// 			handleAs : "json",
		// 			load : function(data) {
		// 				external.detail(detailForm, data);
		// 				external.reg_name = data.regulation_name;
		// 				external.reg_content = data.regulation_content;
		// 				external.remark = data.remark;
		// 				external.inportance = data.inportance;
		// 				external.word_id = data.word_id;
		// 			}
				    
		// 		});
		// 		common.selectOneFromPanelSet(this, 'PanelSet', 'EditPanel');
		// 	} else if(selectedItem.typeinfo == 'externalWord') {
		// 		var detailForm = tpa.getWidget(external.tpaId, "Edit_Word_Form");
		// 		detailForm.clearFormData();
		// 		var word_id = selectedItem.wordid[0];
		// 		xhr("GET", {
		// 			url : '../rest/lar/wig?action=WordDetail&word_id=' + word_id,
		// 			handleAs : "json",
		// 			load : function(data) {
		// 				var word_name = data.word_name != null ? data.word_name : "";
		// 				var indexofDot = word_name.lastIndexOf(".");
		// 				data.word_name = indexofDot > 0 ? word_name.substring(0,indexofDot) : word_name;
		// 				detailForm.set('value',data);
		// 				external.word_name = word_name;
		// 				external.label_ids = data.label_name;
		// 				external.proof = data.proof;
		// 				external.publish_date = data.publish_date;
		// 				external.type = indexofDot >= 0 ?  word_name.substring(indexofDot,word_name.length) : "";
		// 			}
		// 		});
		// 		common.selectOneFromPanelSet(this, 'PanelSet', 'editUploadPanel');
		// 	}else{
		// 		external.showOPInfo(selectedItem, "修改");
		// 	}
		// },
		// //保存条款
		// save : function() {
		// 	var form = tpa.getWidget(this, 'Add_Regulation_Form');
		// 	if(form.value.regulation_content == '' || form.value.regulation_name == '' || form.value.inportance == '') {
		// 		common.showResultDialog({
		// 			'msg_info' : '请把信息填写完整',
		// 			'msg_no' : 1
		// 		});
		// 		return;
		// 	}
		// 	var tree = tpa.getWidget(this, 'Tree');
		// 	var selectedItem = tree.selectedItem;
		// 	var self = this;
		// 	xhr("POST", {
		// 		url : '../rest/lar/eig',
		// 		postData : {
		// 			'word_id' : dojo.toJson(selectedItem.wordid),
		// 			'value' : dojo.toJson(form.value)
		// 		},
		// 		handleAs : "json",
		// 		load : function(data) {
		// 			if(data.msg_no == 1) {
		// 				common.showResultDialog({
		// 					'msg_info' : '保存成功',
		// 					'msg_no' : 0
		// 				});
		// 				if(external.treeType == 'keyWord'){
		// 					var item = tree.getChildren()[0].item;
		// 					var root_arr = item.children;
		// 					for (var i=0; i<root_arr.length; i++) {
		// 						if (root_arr[i].children && root_arr[i].children.length > 0 && root_arr[i].name[0] == external.publisher) {
		// 							var root_item = root_arr[i];
		// 							var second_node_arr = root_item.children;
		// 							for(var m=0; m<second_node_arr.length; m++){
		// 								if(second_node_arr[m].children && second_node_arr[m].children.length > 0){
		// 									var word_arr = second_node_arr[m].children;
		// 									for(var y=0;y<word_arr.length;y++){
		// 										if(word_arr[y].name[0] == selectedItem.name ){
		// 											var secondItem = word_arr[y];
		// 											var moreInfo = {regulationid : data.msg_info};
		// 											var newItemObj = external.getBaseItem(form.value.regulation_name, selectedItem.type[0], 'externalRegulation', "", secondItem);
		// 											tree.model.store.newItem(dojo.mixin(newItemObj.baseInfo, moreInfo) ,newItemObj.parentInfo);
		// 					                        if (secondItem.children && typeof tree.getNodesByItem(secondItem)[0] != "undefined") {
		// 					                           tree._expandNode(tree.getNodesByItem(secondItem)[0]);
		// 					                           tree.dndController.setSelection(tree.getNodesByItem(secondItem.children[secondItem.children.length-1]));
		// 					                        }
		// 										}
		// 									}
		// 								}
		// 							}
		// 							break;
		// 						}
		// 					}
		// 				} else {
		// 					var moreInfo = {regulationid : data.msg_info};
		// 					var newItemObj = external.getBaseItem(form.value.regulation_name, selectedItem.type[0], 'externalRegulation', "", selectedItem);
		// 					tree.model.store.newItem(dojo.mixin(newItemObj.baseInfo, moreInfo) ,newItemObj.parentInfo);
	 //                        if (selectedItem.children) {
	 //                           tree._expandNode(tree.getNodesByItem(selectedItem)[0]);
	 //                           tree.dndController.setSelection(tree.getNodesByItem(selectedItem.children[selectedItem.children.length-1]));
	 //                        }
		// 				}
  //                       external.regulation_id = data.msg_info;
  //                       external.showRegulation(external.regulation_id);
		// 			} else {
		// 				common.showResultDialog({
		// 					'msg_info' : data.msg_info,
		// 					'msg_no' : data.msg_no
		// 				});
		// 			}
		// 		},
		// 		error : function(resultdata, ioArgs) {
		// 			common.showResultDialog({
		// 				'msg_info' : '保存失败',
		// 				'msg_no' : 1
		// 			});
		// 		}
		// 	});
		// },
		
		// //修改文档
		// modify_word : function() {
		// 	var form = tpa.getWidget(this, 'Edit_Word_Form');
		// 	var label_id_arr = tpa.getWidget(external.tpaId,"labelNameEditSet").selectIds;;
		// 	if(form.value.word_name == '' || (label_id_arr && label_id_arr.length == 0)) {
		// 		common.showResultDialog({
		// 			'msg_info' : '抱歉：请先将内容填写完整！',
		// 			'msg_no' : 1
		// 		});
		// 		return;
		// 	}
		// 	var word_name = form.value.word_name;
		// 	var word_name_withtype = word_name;
		// 	var label_ids;
		// 	var label_name_arr = tpa.getWidget(external.tpaId,"labelNameEditSet").selectNames;;
		// 	if(external.type != ""){
		// 		word_name_withtype = word_name + external.type;
		// 	}
		// 	if(label_id_arr.length > 0)
		// 		label_ids = label_id_arr.toString();
		// 	if (word_name_withtype == external.word_name && label_ids == external.label_ids) {
		// 	    common.showResultDialog({
		// 			'msg_info' : '文档信息未作修改',
		// 			'msg_no' : 1
		// 		});
		// 		return;
		// 	}
		// 	var self = this;
		// 	var tree = tpa.getWidget(this, 'Tree');
		// 	var selectedItem = tree.selectedItem;
		// 	form.value.label_name = label_ids;
		// 	xhr("PUT", {
		// 		url : '../rest/lar/wig',
		// 		postData : {
		// 		    'word_id' : selectedItem.wordid[0],
		// 		    'word_name' : external.word_name,
		// 		    'word_type' : external.type,
		// 			'value' : dojo.toJson(form.value),
		// 			'publisher': selectedItem.publisher,
		// 			'is_external' : 0
		// 		},
		// 		handleAs : "json",
		// 		load : function(data) {
		// 			if (data.msg_no == 1) {
		// 				common.showResultDialog({
		// 					'msg_info' : '保存成功',
		// 					'msg_no' : 0
		// 				});
		// 				var wordId = selectedItem.wordid[0];
		// 				var selectedParentItem = tree.selectedNode.getParent().item;
		// 				if(selectedParentItem.typeinfo == 'externalLabel'){
		// 					var old_name = external.word_name;
		// 					if(old_name.lastIndexOf('.')){
		// 						old_name = old_name.substring(0, old_name.lastIndexOf('.'));
		// 					}
		// 					var publisherItem = tree.getNodesByItem(selectedParentItem)[0].getParent().item;
		// 					dojo.forEach(label_id_arr, function(labelId,index){
		// 						var exsist = false;
		// 						dojo.forEach(publisherItem.children,function(pItem, pIndex){
		// 							//如果当前树上含有这个标签
		// 							if(labelId == pItem.label_name_id){
		// 								var exsistW = false;
		// 								dojo.forEach(pItem.children,function(cItem, cIndex){
		// 									if(cItem.wordid[0] == wordId){
		// 										tree.model.store.setValue(cItem, 'name', word_name);
		// 										exsistW = true;
		// 									}
		// 									if(!exsistW && cIndex == pItem.children.length - 1 ){
		// 										var moreInfo = {wordid : wordId, proof : selectedItem.proof[0], publish_date : selectedItem.publish_date[0]};
		// 										var newItemObj = external.getBaseItem(word_name, "menu", 'externalWord', selectedItem.publisher[0], pItem);
		// 										var wordNewItem = tree.model.store.newItem(dojo.mixin(newItemObj.baseInfo, moreInfo) ,newItemObj.parentInfo);
		// 										external.copyRegulationItem(selectedItem, wordNewItem);
		// 									}
		// 								});
		// 								exsist = true;
		// 							}
		// 							//如果当前不含这个标签节点插入新的节点
		// 							if(!exsist && pIndex == publisherItem.children.length - 1){
		// 								var moreInfo = {label_name_id : labelId};
		// 								var newItemObj = external.getBaseItem(label_name_arr[index], "menu", 'externalLabel', selectedItem.publisher[0], publisherItem);
		// 								var newLabelNode = tree.model.store.newItem(dojo.mixin(newItemObj.baseInfo, moreInfo) ,newItemObj.parentInfo);
										
		// 								moreInfo = {wordid : wordId, proof : selectedItem.proof[0], publish_date : selectedItem.publish_date[0]};
		// 								newItemObj = external.getBaseItem(word_name, "menu", 'externalWord', selectedItem.publisher[0], newLabelNode);
		// 								var wordNewItem = tree.model.store.newItem(dojo.mixin(newItemObj.baseInfo, moreInfo) ,newItemObj.parentInfo);
		// 								external.copyRegulationItem(selectedItem, wordNewItem);
		// 							}
		// 						});
		// 					});
		// 					if(label_ids != external.label_ids){
		// 						dojo.forEach(publisherItem.children, function(sItem, sIndex){
		// 							var labels = sItem.children ? sItem.children : [];
		// 							if(label_id_arr.indexOf(sItem.label_name_id[0]) < 0){
		// 								dojo.forEach(sItem.children, function(item, index){
		// 									if(wordId == item.wordid[0]){
		// 										tree.model.store.deleteItem(item);
		// 										if(typeof sItem.children == "undefined" || sItem.children.length == 0){
		// 											tree.model.store.deleteItem(sItem);
		// 										}
		// 									}
		// 								});
		// 							}
		// 						});
		// 					}
		// 				}else{
		// 					tree.model.store.setValue(selectedItem, 'name', word_name);
		// 				}
		// 				external.word_id = selectedItem.wordid[0];
		// 				external.word_name = word_name;
		// 				external.showWord(external.word_id);
		// 			} else {
		// 				common.showResultDialog({
		// 					'msg_info' : data.msg_info,
		// 					'msg_no' : data.msg_no
		// 				});
		// 			}
		// 		},
		// 		error : function(resultdata, ioArgs) {
		// 			common.showResultDialog({
		// 				'msg_info' : '保存失败',
		// 				'msg_no' : 1
		// 			});
		// 		}
		// 	});
		// },
		
		
  //       //新建文档节点，迁移下面的法规
  //       copyRegulationItem : function(selectedItem, wordNewItem){
  //       	var tree = tpa.getWidget(external.tpaId, "Tree");
		// 	if(typeof selectedItem.children != "undefined" && selectedItem.children.length > 0){
		// 		dojo.forEach(selectedItem.children, function(item, index){
		// 			var cMoreInfo = {regulationid : item.regulationid};
		// 			var cNewItemObj = external.getBaseItem(item.name, item.type[0], 'externalRegulation', "", wordNewItem);
		// 			tree.model.store.newItem(dojo.mixin(cNewItemObj.baseInfo, cMoreInfo) ,cNewItemObj.parentInfo);
		// 		});
		// 	}
  //       },
  //       //创造newItem的基础性的信息
  //       getBaseItem : function(name, type, typeinfo, publisher, parent){
  //       	var newItem = {};
  //       	newItem.baseInfo = {
  //               id : new uuid(generateTimeBasedUuid()).toString(),
  //               name : name,
  //               type : type,
  //               typeinfo : typeinfo,
  //               publisher : publisher
  //           };
  //       	newItem.parentInfo = {
  //               parent : parent, 
  //               attribute : 'children'
  //           }
  //       	return newItem;
  //       }        
	});
	return external;
});