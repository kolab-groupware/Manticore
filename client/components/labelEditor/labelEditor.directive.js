'use strict';

angular.module('manticoreApp')
.directive('labelEditor', function ($timeout) {
    return {
      templateUrl: 'components/labelEditor/labelEditor.html',
      restrict: 'E',
      scope: {
          model: '=ngModel'
      },
      link: function (scope, element, attrs) {
          scope.placeholder = attrs.placeholder;
          scope.handleEnterKey = function ($event) {
              if ($event.keyCode === 13) {
                  $event.target.blur();
              }
          };
          scope.change = function () {
              $timeout(function () {
                  scope.$parent.$eval(attrs.ngChange);
              });
          };
      }
    };
});
