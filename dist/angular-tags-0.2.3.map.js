{"version":3,"file":"dist/angular-tags-0.2.3.min.js","sources":["generated/tags.js"],"names":["angular","module","e","tags","defaultOptions","delimiter","classes","templateUrl","tagTemplateUrl","SRC_REGEXP","kc","enter","esc","backspace","kcCompleteTag","kcRemoveTag","kcCancelInput","id","constant","controller","$scope","$timeout","deletedSrcTags","getClasses","tag","r","toggles","selectedTag","selected","forEach","options","klass","groupName","group","_filterSrcTags","idx","srcTags","indexOf","splice","push","add","i","_add","inputTag","$emit","$id","fail","length","name","addable","selectArea","inputActive","remove","directive","$filter","$rootScope","restrict","require","link","scope","element","attrs","ngModel","delimiterRx","RegExp","cancel","$setViewValue","$render","addTag","value","match","addTags","removeLastTag","orderedTags","$viewValue","orderBy","bind","$$phase","$apply","evt","charCodeAt","which","$watch","newVal","focus","$parsers","unshift","values","split","val","$formatters","$document","$parse","decipherTagsOptions","template","model","srcResult","source","srcWatch","pureStrings","stringArray","defaults","copy","userDefaults","parse","input","Error","itemName","sourceName","viewMapper","modelMapper","format","arr","sanitize","replace","isUndefined","isString","map","item","trim","isArray","isDefined","updateSrc","locals","o","obj","src","$parent","isFunction","oldVal","isObject","extend","$eval","oldValue","join","$on","data"],"mappings":"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","sourceRoot":"/"}