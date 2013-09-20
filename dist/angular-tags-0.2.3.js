/*global angular*/
(function () {
  'use strict';

  try {
    angular.module('decipher.tags.templates');
  } catch (e) {
    angular.module('decipher.tags.templates', []);
  }

  var tags = angular.module('decipher.tags',
    ['ui.bootstrap.typeahead', 'decipher.tags.templates']);

  var defaultOptions = {
      delimiter: ',', // if given a string model, it splits on this
      classes: {}, // obj of group names to classes
      templateUrl: 'templates/tags.html', // default template
      tagTemplateUrl: 'templates/tag.html' // default 'tag' template
    },

  // for parsing comprehension expression
    SRC_REGEXP = /^\s*(.*?)(?:\s+as\s+(.*?))?\s+for\s+(?:([\$\w][\$\w\d]*))\s+in\s+(.*)$/,

  // keycodes
    kc = {
      enter: 13,
      esc: 27,
      backspace: 8
    },
    kcCompleteTag = [kc.enter],
    kcRemoveTag = [kc.backspace],
    kcCancelInput = [kc.esc],
    id = 0;

  tags.constant('decipherTagsOptions', {});

  /**
   * TODO: do we actually share functionality here?  We're using this
   * controller on both the subdirective and its parent, but I'm not sure
   * if we actually use the same functions in both.
   */
  tags.controller('TagsCtrl',
    ['$scope', '$timeout', function ($scope, $timeout) {

      var deletedSrcTags = [];

      /**
       * Figures out what classes to put on the tag span.  It'll add classes
       * if defined by group, and it'll add a selected class if the tag
       * is preselected to delete.
       * @param tag
       * @returns {{}}
       */
      $scope.getClasses = function getGroupClass(tag) {
        var r = {};

        if (tag === $scope.toggles.selectedTag) {
          r.selected = true;
        }
        angular.forEach($scope.options.classes, function (klass, groupName) {
          if (tag.group === groupName) {
            r[klass] = true;
          }
        });
        return r;
      };

      /**
       * Finds a tag in the src list and removes it.
       * @param tag
       * @returns {boolean}
       */
      $scope._filterSrcTags = function filterSrcTags(tag) {
        var idx = $scope.srcTags.indexOf(tag);

        if (idx >= 0) {
          $timeout(function () {
            $scope.srcTags.splice(idx, 1);
          });
          deletedSrcTags.push(tag);
          return true;
        }
        return false;

      };

      /**
       * Adds a tag to the list of tags, and if in the typeahead list,
       * removes it from that list (and saves it).  emits decipher.tags.added
       * @param tag
       */
      $scope.add = function add(tag) {
        var idx,
          _add = function _add(tag) {
            $scope.tags.push(tag);
            delete $scope.inputTag;
            $scope.$emit('decipher.tags.added', {
              tag: tag,
              $id: $scope.$id
            });
          },
          fail = function fail() {
            $scope.$emit('decipher.tags.addfailed', {
              tag: tag,
              $id: $scope.$id
            });
          },
          i;

        // don't add dupe names
        i = $scope.tags.length;
        while (i--) {
          if ($scope.tags[i].name === tag.name) {
            fail();
            return false;
          }
        }


        if ($scope._filterSrcTags(tag)) {
          _add(tag);
          return true;
        }
        else if ($scope.options.addable) {
          _add(tag);
          return true;
        }
        fail();
        return false;
      };

      /**
       * Toggle the input box active.
       */
      $scope.selectArea = function selectArea() {
        $scope.toggles.inputActive = true;
      };

      /**
       * Removes a tag.  Restores stuff into srcTags if it came from there.
       * Kills any selected tag.  Emit a decipher.tags.removed event.
       * @param tag
       */
      $scope.remove = function remove(tag) {
        var idx;
        $scope.tags.splice($scope.tags.indexOf(tag), 1);

        if (idx = deletedSrcTags.indexOf(tag) >= 0) {
          deletedSrcTags.splice(idx, 1);
          $scope.srcTags.push(tag);
        }

        delete $scope.toggles.selectedTag;

        $scope.$emit('decipher.tags.removed', {
          tag: tag,
          $id: $scope.$id
        });
      };

    }]);

  /**
   * Directive for the 'input' tag itself, which is of class
   * decipher-tags-input.
   */
  tags.directive('decipherTagsInput',
    ['$timeout', '$filter', '$rootScope',
     function ($timeout, $filter, $rootScope) {
       return {
         restrict: 'C',
         require: 'ngModel',
         link: function (scope, element, attrs, ngModel) {
           var delimiterRx = new RegExp('^' +
                                        scope.options.delimiter +
                                        '+$'),

             /**
              * Cancels the text input box.
              */
               cancel = function cancel() {
               ngModel.$setViewValue('');
               ngModel.$render();
             },

             /**
              * Adds a tag you typed/pasted in unless it's a bunch of delimiters.
              * @param value
              */
               addTag = function addTag(value) {
               if (value) {
                 if (value.match(delimiterRx)) {
                   cancel();
                   return;
                 }
                 if (scope.add({
                   name: value
                 })) {
                   cancel();
                 }
               }
             },

             /**
              * Adds multiple tags in case you pasted them.
              * @param tags
              */
               addTags = function (tags) {
               var i;
               for (i = 0; i < tags.length;
                    i++) {
                 addTag(tags[i]);
               }
             },

             /**
              * Backspace one to select, and a second time to delete.
              */
               removeLastTag = function removeLastTag() {
               var orderedTags;
               if (scope.toggles.selectedTag) {
                 scope.remove(scope.toggles.selectedTag);
                 delete scope.toggles.selectedTag;
               }
               // only do this if the input field is empty.
               else if (!ngModel.$viewValue) {
                 orderedTags =
                 $filter('orderBy')(scope.tags,
                   scope.orderBy);
                 scope.toggles.selectedTag =
                 orderedTags[orderedTags.length -
                             1];
               }
             };

           /**
            * When we focus the text input area, drop the selected tag
            */
           element.bind('focus', function () {
             // this avoids what looks like a bug in typeahead.  It seems
             // to be calling element[0].focus() somewhere within a digest loop.
             if ($rootScope.$$phase) {
               delete scope.toggles.selectedTag;
             } else {
               scope.$apply(function () {
                 delete scope.toggles.selectedTag;
               });
             }
           });

           /**
            * Detects the delimiter.
            */
           element.bind('keypress',
             function (evt) {
               scope.$apply(function () {
                 if (scope.options.delimiter.charCodeAt() ===
                     evt.which) {
                   addTag(ngModel.$viewValue);
                 }
               });
             });

           /**
            * Inspects whatever you typed to see if there were character(s) of
            * concern.
            */
           element.bind('keypress',
             function (evt) {
               scope.$apply(function () {
                 // to "complete" a tag

                 if (kcCompleteTag.indexOf(evt.which) >=
                     0) {
                   addTag(ngModel.$viewValue);

                   // or if you want to get out of the text area
                 } else if (kcCancelInput.indexOf(evt.which) >=
                            0) {
                   cancel();
                   scope.toggles.inputActive =
                   false;

                   // or if you're trying to delete something
                 } else if (kcRemoveTag.indexOf(evt.which) >=
                            0) {
                   removeLastTag();

                   // otherwise if we're typing in here, just drop the selected tag.
                 } else {
                   delete scope.toggles.selectedTag;
                   scope.$emit('decipher.tags.keyup',
                     {
                       value: ngModel.$viewValue,
                       $id: scope.$id
                     });
                 }
               });
             });

           /**
            * When inputActive toggle changes to true, focus the input.
            * And no I have no idea why this has to be in a timeout.
            */
           scope.$watch('toggles.inputActive',
             function (newVal) {
               if (newVal) {
                 $timeout(function () {
                   element[0].focus();
                 });
               }
             });

           /**
            * Detects a paste or someone jamming on the delimiter key.
            */
           ngModel.$parsers.unshift(function (value) {
             var values = value.split(scope.options.delimiter);
             if (values.length > 1) {
               addTags(values);
             }
             if (value.match(delimiterRx)) {
               element.val('');
               return;
             }
             return value;
           });

           /**
            * Resets the input field if we selected something from typeahead.
            */
           ngModel.$formatters.push(function (tag) {
             if (tag && tag.value) {
               element.val('');
               return;
             }
             return tag;
           });
         }
       };
     }]);

  /**
   * Main directive
   */
  tags.directive('tags',
    ['$document', '$timeout', '$parse', 'decipherTagsOptions',
     function ($document, $timeout, $parse, decipherTagsOptions) {

       return {
         controller: 'TagsCtrl',
         restrict: 'E',
         template: '<ng-include data-src="options.templateUrl"></ng-include>',
         scope: {
           model: '='
         },
         link: function (scope, element, attrs) {
           var srcResult,
             source,
             tags,
             group,
             value,
             i,
             srcWatch,
             model,
             pureStrings = false,
             stringArray = false,
             defaults = angular.copy(defaultOptions),
             userDefaults = angular.copy(decipherTagsOptions),

             /**
              * Parses the comprehension expression and gives us interesting bits.
              * @param input
              * @returns {{itemName: *, source: *, viewMapper: *, modelMapper: *}}
              */
               parse = function parse(input) {
               var match = input.match(SRC_REGEXP);
               if (!match) {
                 throw new Error(
                   "Expected src specification in form of '_modelValue_ (as _label_)? for _item_ in _collection_'" +
                   " but got '" + input + "'.");
               }

               return {
                 itemName: match[3],
                 source: $parse(match[4]),
                 sourceName: match[4],
                 viewMapper: $parse(match[2] || match[1]),
                 modelMapper: $parse(match[1])
               };

             },
             /**
              * Takes a raw model value and returns something suitable
              * to assign to scope.tags
              * @param value
              */
               format = function format(value) {
               var arr = [],
                 sanitize = function sanitize(tag) {
                   return tag
                     .replace(/&/g, '&amp;')
                     .replace(/</g, '&lt;')
                     .replace(/>/g, '&gt;')
                     .replace(/'/g, '&#39;')
                     .replace(/"/g, '&quot;');
                 };
               if (angular.isUndefined(value)) {
                 return;
               }
               if (angular.isString(value)) {
                 arr = value
                   .split(scope.options.delimiter)
                   .map(function (item) {
                     return {
                       name: sanitize(item.trim())
                     };
                   });
               }
               else if (angular.isArray(value)) {
                 arr = value.map(function (item) {
                   if (angular.isString(item)) {
                     return {
                       name: sanitize(item.trim())
                     };
                   }
                   else if (item.name) {
                     item.name = sanitize(item.name.trim());
                   }
                   return item;
                 });
               }
               else if (angular.isDefined(value)) {
                 throw 'list of tags must be an array or delimited string';
               }
               return arr;
             },
             /**
              * Updates the source tag information.  Sets a watch so we
              * know if the source values change.
              */
               updateSrc = function updateSrc() {
               var locals,
                 i,
                 o,
                 obj;
               // default to NOT letting users add new tags in this case.
               scope.options.addable = scope.options.addable || false;
               srcResult = parse(attrs.src);
               source = srcResult.source(scope.$parent);

               if (angular.isUndefined(source)) {
                 return;
               }
               if (angular.isFunction(srcWatch)) {
                 srcWatch();
               }
               srcWatch =
               scope.$parent.$watch(srcResult.sourceName,
                 function (newVal, oldVal) {
                   if (newVal !== oldVal) {
                     updateSrc();
                   }
                 }, true);
               locals = {};
               if (angular.isDefined(source)) {
                 for (i = 0; i < source.length; i++) {
                   locals[srcResult.itemName] = source[i];
                   obj = {};
                   obj.value = srcResult.modelMapper(scope.$parent, locals);
                   if (obj.value.group || obj.value.value) {
                     group = obj.value.group;
                     value = obj.value.value;
                   }
                   else {
                     value = obj.value;
                   }
                   o = {};
                   if (angular.isObject(obj.value)) {
                     o = angular.extend(angular.extend(o, obj.value), {
                       name: srcResult.viewMapper(scope.$parent, locals),
                       value: value,
                       group: group
                     });
                   } else {
                     o = {
                       name: srcResult.viewMapper(scope.$parent, locals),
                       value: value,
                       group: group
                     };
                   }
                   scope.srcTags.push(o);
                 }
               }
             };

           // merge options
           scope.options = angular.extend(defaults,
             angular.extend(userDefaults, scope.$eval(attrs.options)));
           // break out orderBy for view
           scope.orderBy = scope.options.orderBy;

           // this should be named something else since it's just a collection
           // of random shit.
           scope.toggles = {
             inputActive: false
           };

           /**
            * Watches tags for changes and propagates to outer model
            * in the format which we originally specified (see below)
            */
           scope.$watch('tags', function (value, oldValue) {
             var i;
             if (value !== oldValue) {
               if (stringArray || pureStrings) {
                 value = value.map(function (tag) {
                   return tag.name;
                 });
                 scope.model.length = 0;
                 for (i = 0; i < value.length; i++) {
                   scope.model.push(value[i]);
                 }
                 if (pureStrings) {
                   scope.model = value.join(scope.options.delimiter);
                 }
               }
             }
           }, true);

           /**
            * When we receive this event, sort.
            */
           scope.$on('decipher.tags.sort', function (evt, data) {
             scope.orderBy = data;
           });

           // determine what format we're in
           model = scope.model;
           if (angular.isString(model)) {
             pureStrings = true;
           }
           else if (angular.isArray(model)) {
             stringArray = true;
             i = model.length;
             while (i--) {
               if (!angular.isString(model[i])) {
                 stringArray = false;
                 break;
               }
             }
           }

           // remove already-used stuff out of the src
           scope.tags = format(scope.model);
           // this stuff takes the parsed comprehension expression and
           // makes a srcTags array full of tag objects out of it.
           scope.srcTags = [];
           if (angular.isDefined(attrs.src)) {
             updateSrc();
           } else {
             // if you didn't specify a src, you must be able to type in new tags.
             scope.options.addable = true;
           }

           // remove already used tags
           i = scope.tags.length;
           while(i--) {
             scope._filterSrcTags(scope.tags[i]);
           }
           
           // emit identifier
           scope.$id = ++id;
           scope.$emit('decipher.tags.initialized', {
             $id: scope.$id,
             model: scope.model
           });
         }
       };
     }]);

})();