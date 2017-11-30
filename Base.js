define(["dojo/_base/lang",
		"dojo/dom-construct",
		"dojo/_base/array",
		
],function(lang, domConstruct, array, domClass, keys, tpa, common, uuid, generateTimeBasedUuid, xhr, ioIframe, ZTree,TAZTree) {
	// 注册dojo.tpa.lar.base
	var base = tpa.register('lar.base');
	lang.mixin(base, {
		onLoad: function(project, id) {
			project.tpaId = id;
			project.searchState = false;
			project.treeType = "date";
			project.containerWrap = dojo.byId(id+"-containerWrap");
			base.createZTree(project, id, project.url);
			base.showLoading(project.containerWrap);
			if(project.pageName == "external"){
				base.hasLoadPublishers = false;
			}
		},
    	//创建ztree
        createZTree: function(project, id, url) {
            var treeDiv = domConstruct.create("div", {
                id: id + "-TreeDiv",
                innerHTML: ""
            });
            dojo.byId(id + "-menuTree").appendChild(treeDiv);
            var treeObj ={
                id: id + "-Tree",
                url: url,
                onAsyncSuccess: function(event, treeId, treeNode, msg) {
                    base.reAsyncSuccess(project);
		  			base.hiddenLoading(project.containerWrap);
                },
                onClick: function(evt, treeId, treeNode) {
                	base.showDetail(evt, treeId, treeNode, project);
                }
            }
            if(project.pageName =='reportManagement' || project.pageName =='internal' ){
            	treeObj = dojo.mixin(treeObj,{menuId: id + "-tree_menu",menuOpen: base._checkMenuEnable});
            }
            new ZTree(treeObj, id + "-TreeDiv").startup();
            
        },
        /*数据异步加载成功回调函数*/
        reAsyncSuccess: function(project) {
			base.showRootList(project);
			if(project.searchState) {
				base.treeAddCount(project);
			}
			if(project.pageName == "external" && !base.hasLoadPublishers){
				base.initPublisherData(project.tpaId);
			}
		},
		//初始化发布单位的下拉数据
		initPublisherData : function(id){
			var tree = tpa.getWidget(id, 'Tree');
			var items = [];
			var publisherLiArr = [];
			var checkAllObj = $("#"+ id +"-selectAll > i");
			if(tree){
				items = tree.zTree.getNodes();
				var liTemp = "";
				dojo.forEach(items, function(item, index){
					liTemp = "<li><a><span>"+ item.name +"</span><i class='icon-ok'></i></a></li>"
					publisherLiArr.push(liTemp);
				})
			}
			dojo.byId(id+"-publisherList").innerHTML = publisherLiArr.join("");
			dojo.byId(id +"-allNum").innerHTML = publisherLiArr.length;
			$("#"+ id +"-selectPublisher").unbind("click").click(function(){
				$(".externalMutiSelect").toggleClass("open");
			})
			$(".externalMutiSelect li").unbind("click").click(function(){
				$(this).toggleClass("selected");
				var selectedLen = $(".externalMutiSelect li.selected").length;
				var allLen = $(".externalMutiSelect li").length;
				dojo.byId(id +"-selectedNum").innerHTML = selectedLen;
				if(selectedLen == allLen){
					checkAllObj.addClass("fa-check-sign").removeClass("fa-check-empty");
				}else{
					if(checkAllObj.hasClass("fa-check-sign")){
						checkAllObj.removeClass("fa-check-sign").addClass("fa-check-empty");
					}
				}
			})
			$(document).unbind("click").click(function(){
				$(".externalMutiSelect").removeClass("open");
			});
			$(".externalMutiSelect").unbind("click").click(function(event){
				event.stopPropagation();
			});
			$("#"+ id +"-selectAll").unbind("click").click(function(evt){
				var curPubliser = {};
				checkAllObj = $("#"+ id +"-selectAll > i");
				if(checkAllObj.hasClass("fa-check-empty")){
					for(var i = 0; i < (curPubliser = $(".externalMutiSelect li")).length; i++){
						curPubliser = $(curPubliser[i]);
						if(!curPubliser.hasClass("selected")){
							curPubliser.addClass("selected");
						}
					}
				}else{
					for(var i = 0; i < (curPubliser = $(".externalMutiSelect li")).length; i++){
						curPubliser = $(curPubliser[i]);
						if(curPubliser.hasClass("selected")){
							curPubliser.removeClass("selected");
						}
					}
				}
				dojo.byId(id +"-selectedNum").innerHTML = $(".externalMutiSelect li.selected").length;
				checkAllObj.toggleClass("fa-check-sign").toggleClass("fa-check-empty");
			});
			base.hasLoadPublishers = true;
		},
		//重置表单
		restSearchForm : function(tpaId, formId){
			var form = dojo.byId(formId);
			form.reset();
			tpa.getWidget(tpaId, 'startDate').displayedValue = "起始日期";
			tpa.getWidget(tpaId, 'endDate').displayedValue = "截止日期";
		},
		//搜索域全选
		searchField : function(searchPanelId){
			var checkSate = true;
			var notSelect = dojo.query('input[name="field"]:not(:checked)',searchPanelId);
			dojo.forEach(notSelect, function(item, index){
				item.checked = true;
			});
		},
		//返回按钮
		returnBack : function(project){
			common.selectOneFromPanelSet(project.tpaId, 'PanelSet', 'EmptyPanel');
		},
		//回到顶部
		topTopOrBottom : function(contentId, tipId){
		    $(contentId).scroll(function() {      
		        if($(contentId).scrollTop() >= 100){
		            $(tipId).fadeIn(300); 
		        }else{    
		            $(tipId).fadeOut(300);    
		        }
		    });
		    $(tipId).click(function(){
		    	$(contentId).animate({scrollTop: '0px'}, "fast");
		    });   
		},
		//为树添加红色搜索的统计数
		treeAddCount : function(project){
			var tree = tpa.getWidget(project.tpaId, "Tree");
			var nodes = tree.zTree.getNodes();
    		dojo.forEach(nodes,function(item, index){
	    		var textArea = dojo.byId(item.tId + '_span');
	    		if(textArea && typeof item.count !== "undefined"){
	    			textArea.innerHTML = textArea.innerHTML + "<i class=lar_count "+ project.pageName +"Count lar_count>"+ item.count +"</i>";
	    		}
    		});
	    	$(window).resize();
		},
		//显示详细信息
		showDetail : function(evt, treeId, treeNode, project) {
			var typeinfo = treeNode.typeinfo;
			if(typeinfo == project.pageName + "Date" || typeinfo == project.pageName + "Label" || typeinfo == project.pageName + "SecondNode"){
				var tree = tpa.getWidget(project.tpaId, "Tree");
		   		var defaultMarkName = treeNode.name;
				base.showWordList(project, treeNode.getParentNode(), defaultMarkName);
				base.setDefaultMark(project, defaultMarkName);		
			}else{
				switch(typeinfo){
					case project.pageName + "Node": base.showWordList(project, treeNode); break;
					case project.pageName + "Word": base.showWord(project, treeNode.wordid); break;
					case project.pageName + "Regulation": base.showRegulation(project, treeNode.regulationid); break;
				}
			}
		},
		//展示根节点的列表信息
        showRootList : function(project){
        	var tree = tpa.getWidget(project.tpaId, "Tree");
    		var nodes = tree.zTree.getNodes();
	   		var nodeIndex = 0;
    		var rootItem = [];
    		if(nodes.length > 0){
    			if (project.searchState && nodes.length > 1) {
    	   			nodeIndex = 1;
    	   		}
    			rootItem = nodes[nodeIndex];
       			tree.zTree.selectNode(rootItem);
       			tree.zTree.expandNode(rootItem);
    		}
   			base.showWordList(project, rootItem);
        },
        //展示标签分类的文档列表
		showWordList : function(project, obj, defaultMark){
			common.selectOneFromPanelSet(project.tpaId, 'PanelSet', 'EmptyPanel');
			dojo.byId(project.tpaId + "-" + project.pageName + "ListTitle").innerHTML = typeof obj.name == "undefined" ? "抱歉，暂无查询到任何文档！" : obj.name;
			var markListHtml = "";
			var firstWordList = "";
			var countHtml = "";
			var totalCount = 0;
			var wordObjList;
			var currentObj;
			var markDomObj = dojo.byId(project.tpaId + "-" + project.pageName + "MarkList");
			var wordDomObj = dojo.byId(project.tpaId + "-" + project.pageName + "FirstWordList");
			var countDomObj = dojo.byId(project.tpaId + "-" + project.pageName + "ListCount");
			var listTitleObj = dojo.byId(project.tpaId + "-" + project.pageName + "ListDes")
			var marksObjList = typeof obj.children == "undefined" ? [] : obj.children;
			if(marksObjList.length == 0){
				markListHtml = "<dd><span>暂无标签</span></dd>";
				listTitleObj.innerHTML = "";
			}else{
				var activeMark = dojo.query("span.active", project.tpaId + "-" + project.pageName + "MarkList")[0];
				var initIndex = project.tpaId + "mark-"+0;
				var currentIndex = typeof activeMark == "undefined" ? initIndex : (typeof defaultMark == "undefined" ? initIndex : activeMark.id);
				dojo.forEach(marksObjList, function(item,index){
					var activeClass = ( project.tpaId + "mark-"+ index ) == currentIndex ? "active" : "";
					markListHtml += "<dd><span class='"+ activeClass +"' id='"+( project.tpaId + "mark-"+ index )+"'>"+ item.name +"</span></dd>";
					if(typeof defaultMark != "undefined" && defaultMark == item.name){
						currentObj = item;
					}
					totalCount += typeof item.children == "undefined" ? 0 : item.children.length;
				});
				currentObj = currentObj ? currentObj : marksObjList[0];
				wordObjList = currentObj.children ? currentObj.children : [];
				if(wordObjList.length == 0){
					firstWordList = "<li><a>暂无文档</a></li>";
				}else{
					listTitleObj.innerHTML = '<div class="wordListTitle"><div>文档名称</div><div>发布时间<i class="icon-sort" id="'+ project.tpaId +'-sortByDate" title="更换排序方式"></i></div></div>';
					if(project.searchState){
						var searchWord = project.keyWord;
						dojo.forEach(wordObjList, function(item,index){
							var wordName = (item.name && item.name.length > 0) ? item.name.replace(new RegExp(searchWord, 'g'),'<font color="red">'+ searchWord +'</font>') : "";
							var content = typeof item.regulation_content == "undefined" ? "" : item.regulation_content.replace(new RegExp(searchWord, 'g'),'<font color="red">'+ searchWord +'</font>');
							firstWordList += "<li class='searchWordLi'><i>"+ (index+1) +"</i><p><span>"+ base.getDateByStr(item.publish_date) +"</span><a id="+ item.wordid +" class='searchWordLink'>"+ wordName +"</a></p>" +
									"<p>"+ content +"</p></li>";
						});
					}else{
						dojo.forEach(wordObjList, function(item,index){
							firstWordList += "<li><span>"+ base.getDateByStr(item.publish_date) +"</span><a id="+ item.wordid +">"+ item.name +"</a></li>";
						});
					}
				}
			}
			var countHtml = "总共<strong>"+ totalCount +"</strong>条";
			if(totalCount > 0){
				countHtml = countHtml +"，当前【<font color='blue'>"+ currentObj.name +"</font>】<strong>"+ wordObjList.length +"</strong>条";
			}
			countDomObj.innerHTML = countHtml;
			markDomObj.innerHTML = markListHtml;
			wordDomObj.innerHTML = firstWordList;
			var myClickObject = {
				onWordClick:function(evt){
					if(evt.currentTarget.id != ""){
						base.showWord(project, evt.currentTarget.id);
					}
				},
				onMarkClick:function(evt){
					if(typeof dojo.query("span.active", project.tpaId + "-" + project.pageName + "MarkList")[0] != "undefined"){
						domClass.remove(dojo.query("span.active", project.tpaId + "-" + project.pageName + "MarkList")[0], "active");
						domClass.add(dojo.query(evt.currentTarget)[0],"active");
					}
					base.showWordList(project, obj, evt.currentTarget.innerText);
				},
				dateSortClick : function(evt){
					var listContentObj = dojo.byId(project.tpaId + "-" + project.pageName + "FirstWordList");
					var wordList = dojo.query("li",listContentObj).reverse();
					if(!wordList || wordList.length == 1) return;
					var reListArr = dojo.map(wordList, function(item, index){
						return item.outerHTML;
					});
					listContentObj.innerHTML = reListArr.join("");
					dojo.query("li a", project.tpaId + "-" + project.pageName + "FirstWordList").on("click",lang.hitch(myClickObject,"onWordClick"));
				}
			};
			dojo.query("#"+project.tpaId + "-sortByDate").on("click",lang.hitch(myClickObject,"dateSortClick"));
			dojo.query("dd > span", project.tpaId + "-" + project.pageName + "MarkList").on("click",lang.hitch(myClickObject,"onMarkClick"));
			dojo.query("li a", project.tpaId + "-" + project.pageName + "FirstWordList").on("click",lang.hitch(myClickObject,"onWordClick"));
		},
		//显示文档详情
		showWord : function(project, word_id) {
			project.word_id = word_id;
			var detailForm = tpa.getWidget(project.tpaId, "WordInfo_Form");
			detailForm.clearFormData();
			dojo.byId(project.tpaId+"-wordText").innerHTML = "";
			xhr("GET", {
				url : '../rest/lar/wig?action=WordDetail&wordType='+ project.pageName +'&&word_id=' + word_id,
				handleAs : "json",
				load : function(data) {
					detailForm.set('value',data);
					project.publisher = data.publisher;
					project.label_name = data.label_name;
					var wordText = (data.word_text && data.word_text.length > 0) ? data.word_text : "";
					if(project.searchState && project.keyWord != ""){
						wordText = wordText.length > 0 ? wordText.replace(new RegExp(project.keyWord+"(?=[^>]*(<|$))",'g'),'<font color="red">'+ project.keyWord +'</font>') : "";
					}
					dojo.byId(project.tpaId+"-wordText").innerHTML = wordText;
				}
			});
			var activeLi;
			if(typeof (activeLi = dojo.query("li.active", project.tpaId + "-" + project.pageName + "FirstWordList")[0]) != "undefined"){
				domClass.remove(activeLi, "active");
			}
			if( (activeLi = dojo.byId(word_id)) != null){
				activeLi = activeLi.parentNode;
				if(activeLi.nodeName == "P"){ //搜索状态和初始状态的列表的结构不同
					activeLi = activeLi.parentNode;
				}
				domClass.add(activeLi,"active");
			}
			common.selectOneFromPanelSet(project.tpaId, 'PanelSet', 'downloadPanel');
		},
		//显示法规条款详情
		showRegulation : function (project, regulation_id) {
			if (regulation_id != null && regulation_id.length > 0) {
				  var detailForm = tpa.getWidget(project.tpaId, "Regulation_Form");
				  detailForm.clearFormData();
				  var type = project.pageName == "external"? "eig?" : "iig?action=getRegulationDetail&";
					xhr("GET", {
						url : '../rest/lar/'+ type +'regulation_id=' + regulation_id,
						handleAs : "json",
						load : function(data) {
							base.detail(detailForm, data);
							project.publisher = data.publisher;
						}
					});
					common.selectOneFromPanelSet(project.tpaId, 'PanelSet', 'DetailPanel');
				} else {
					common.selectOneFromPanelSet(project.tpaId, 'PanelSet', 'EmptyPanel');
				}
		},
		//转换时间
		getDateByStr:function(dateStr){
            var regExp = new RegExp(/(\d{4})(\d{2})(\d{2})/);
            regExp.test(dateStr);
            return RegExp.$1 + "-" +  RegExp.$2 + "-" + RegExp.$3; 
        },
        expendTreeNode : function() {
			var tree = tpa.getWidget(this, this.treeName);
			tree.zTree.expandAll(true);
		},
		//树节点 全部折叠
		collapseTreeNode : function() {
			var tree = tpa.getWidget(this, this.treeName);
			tree.zTree.expandAll(false);
		},
		showLoading:function(container){ 
            var height = container.clientHeight;
            var width = container.clientWidth;
            var divNode = domConstruct.create("div", {"class":"hideDiv",style:"height:"+height+"px;width:"+width+"px",innerHTML:"<img src='../themes/default/artemis/images/loading.gif'>"});
            container.appendChild(divNode);
        },
        hiddenLoading:function(container){
            var hideDiv = dojo.query(".hideDiv",container)[0];
            if(!hideDiv) return;
            dojo.destroy(hideDiv);
        },
        setDefaultMark : function(project, defaultMarkName){
        	if(typeof dojo.query("span.active", project.tpaId + "-" + project.pageName + "MarkList") != "undefined"){
        		if (dojo.query("span.active", project.tpaId + "-" + project.pageName +"MarkList").length > 0) {
        			domClass.remove(dojo.query("span.active", project.tpaId + "-" + project.pageName + "MarkList")[0], "active");
        		}
				var markItems = dojo.byId(project.tpaId + "-" + project.pageName + "MarkList").childNodes;
				dojo.some(markItems, function(markItem, index){
					if(markItem.innerText == defaultMarkName){
						domClass.add(markItem.childNodes[0].id,"active");
						return true;
					}
				});
			}
        },
        detail : function(detailForm, data) {
			if(data == null) {
				common.showResultDialog({
					'msg_info' : "无法获取正确的信息",
					'msg_no' : "1"
				});
			} else {
				detailForm.set('value', data);
			}
		},
		//刷新树
		tree_Refresh : function(project) {
			var tree = tpa.getWidget(project.tpaId, 'Tree');
			var treeModel = tree.model;
			var nodes = tree.zTree.getNodes();
			base.showLoading(project.containerWrap);
			tree.zTree.reAsyncChildNodes(null, "refresh");
			base.emptyPanel(project);
		},
		//清空面板
		emptyPanel: function(project) {
	   		dojo.byId(project.tpaId + "-" + project.pageName + 'ListTitle').innerHTML = "";
	   		dojo.byId(project.tpaId + "-" + project.pageName + 'ListCount').innerHTML = "";
	   		dojo.byId(project.tpaId + "-" + project.pageName + 'MarkList').innerHTML = "";
	   		dojo.byId(project.tpaId + "-" + project.pageName + 'FirstWordList').innerHTML = "";
        },
        //修改条款
		modify_regulation : function(project) {
			var form = tpa.getWidget(this, 'Edit_Regulation_Form');
			var regulationData = form.value;
			regulationData.inportance = "0";
			if(regulationData.regulation_name == '' || regulationData.regulation_content == '' || regulationData.regulation_name == '' || regulationData.inportance == '') {
				common.showResultDialog({
					'msg_info' : '请把信息填写完整',
					'msg_no' : 1
				});
				return;
			}
			if (regulationData.regulation_name == project.reg_name && regulationData.regulation_content == project.reg_content 
			    && regulationData.remark == project.remark && regulationData.inportance == project.inportance) {
			    common.showResultDialog({
					'msg_info' : '条款信息未作修改',
					'msg_no' : 1
				});
				return;
			}
			var tree = tpa.getWidget(this, 'Tree');
			var selectedItem = tree.zTree.getSelectedNodes()[0];
			xhr("PUT", {
				url : '../rest/lar/eig',
				postData : {
				    'regulation_id' : selectedItem.regulationid,
				    'word_id' : project.word_id,
					'value' : dojo.toJson(regulationData)
				},
				handleAs : "json",
				load : function(data) {
					if(data.msg_no == 1) {
						common.showResultDialog({
							'msg_info' : '修改成功',
							'msg_no' : 0
						});
						
						if(project.pageName === "external" && project.treeType == 'keyWord'){
							var old_regulation_name = selectedItem.name;
							var word_name = tree.selectedNode.getParent().item;
							var item = tree.getChildren()[0].item;
							var root_arr = item.children;
							for (var i=0; i<root_arr.length; i++) {
								if (root_arr[i].children && root_arr[i].children.length > 0 && root_arr[i].name[0] == external.publisher) {
									var root_item = root_arr[i];
									var second_node_arr = root_item.children;
									for(var m=0; m<second_node_arr.length; m++){
										if(second_node_arr[m].children && second_node_arr[m].children.length > 0){
											var word_arr = second_node_arr[m].children;
											for(var y=0;y<word_arr.length;y++){
												if(word_arr[y].children && word_arr[y].children.length>0 &&  word_arr[y].name[0] == word_name.name[0] ){
													var secondItem = word_arr[y].children;
													for(var n=0;n<secondItem.length;n++){
														if(secondItem[n].name[0] == old_regulation_name){
															tree.model.store.setValue(secondItem[n], 'name', form.value.regulation_name);
														}
													}
												}
											}
										}
									}
									break;
								}
							}
						} else {
							selectedItem.name =  form.value.regulation_name;
							tree.zTree.updateNode(selectedItem);
						}
						project.regulation_id = selectedItem.regulationid;
						base.showRegulation(project, project.regulation_id);
					} else {
						common.showResultDialog({
							'msg_info' : data.msg_info,
							'msg_no' : data.msg_no
						});
					}
				},
				error : function(resultdata, ioArgs) {
					common.showResultDialog({
						'msg_info' : '保存失败',
						'msg_no' : 1
					});
				}
			});
		},
		//下载文档
		download : function(project) {
			window.open("../rest/lar/wlr?word_id=" + project.word_id+"&page_name="+project.pageName);
		},
		
		//提示信息
		showOPInfo : function(project, selectedItem, op){
			var what = "";
			switch(selectedItem.typeinfo[0]){
				case project.pageName + "Node": what = "发布单位"; break;
				case "externalDate": what = "日期"; break;
				case "externalLabel" : what = "标签"; break;
				case "totalCountNode" : what = "统计"; break;
			}
			common.showResultDialog({
				'msg_info' : "提示：" + what + '节点不能' + op,
				'msg_no' : 500
			});
		},
		//隐藏menu
		_hiddenMenu: function(tpaId) {
			var accTree = tpa.getWidget(tpaId, "Tree");
			accTree.hideRMenu();
		},
		//通过唯一标识设定右键菜单要显示的菜单项
		_checkMenuEnable: function(e) {
			 var productItem = TAZTree.getSelectItem.call(this, "Tree");
			 var nodetypeinfo = productItem.typeinfo;
			 if(nodetypeinfo =='reportManagementNode' || nodetypeinfo =='internalNode'){
			 	var disableMap = {
					0: {
						'add_root': 'block',
						"modify_root": 'block',
						"delete_root": 'block',
						'add_second_node': 'block'
					}
				};
			} else if(nodetypeinfo =='reportManagementSecondNode' || nodetypeinfo =='internalSecondNode'){
				var disableMap = {
					0: {
						"modify_second_node": 'block',
						"delete_second_node": 'block'
					}
				};
			}
			var checkHandler = function(item) {
				if(disableMap){
					return disableMap[0][item.type];
				}
			};
			TAZTree.checkMenuEnable.call(this, e, disableMap, checkHandler, "display");
		}
		
	});
	return base;
});