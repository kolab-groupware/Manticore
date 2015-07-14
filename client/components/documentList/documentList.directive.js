'use strict';

angular.module('manticoreApp')
  .directive('documentList', function () {
    return {
      templateUrl: 'components/documentList/documentList.html',
      restrict: 'E',
      controller: 'DocumentListCtrl'
    };
  });
