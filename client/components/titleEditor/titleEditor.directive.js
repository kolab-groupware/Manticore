'use strict';

angular.module('manticoreApp')
  .directive('titleEditor', function () {
    return {
      templateUrl: 'components/titleEditor/titleEditor.html',
      restrict: 'E',
      controller: 'TitleEditorCtrl'
    };
  });
