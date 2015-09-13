'use strict';

angular.module('manticoreApp')
  .directive('exportButton', function () {
    return {
      templateUrl: 'components/exportButton/exportButton.html',
      restrict: 'E',
      controller: 'ExportButtonCtrl',
      scope: true
    };
  });
