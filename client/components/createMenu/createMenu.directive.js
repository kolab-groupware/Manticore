'use strict';

angular.module('manticoreApp')
  .directive('createMenu', function () {
    return {
      templateUrl: 'components/createMenu/createMenu.html',
      restrict: 'E',
      replace: true,
      controller: 'CreateMenuCtrl'
    };
  });
