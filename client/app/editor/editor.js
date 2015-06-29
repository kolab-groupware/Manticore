'use strict';

angular.module('manticoreApp')
  .config(function ($stateProvider) {
    $stateProvider
      .state('editor', {
        url: '/document/:id',
        templateUrl: 'app/editor/editor.html',
        controller: 'EditorCtrl'
      });
  });
