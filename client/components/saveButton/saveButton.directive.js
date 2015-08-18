'use strict';

angular.module('manticoreApp')
  .directive('saveButton', function () {
    return {
      templateUrl: 'components/saveButton/saveButton.html',
      restrict: 'E',
      controller: 'SaveButtonCtrl'
    };
  });
