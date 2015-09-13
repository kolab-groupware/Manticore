'use strict';

angular.module('manticoreApp')
  .config(function ($stateProvider) {
    $stateProvider
      .state('manticore.templates', {
        url: '/templates',
        templateUrl: 'app/templates/templates.html',
        controller: 'TemplatesCtrl'
      });
  });
