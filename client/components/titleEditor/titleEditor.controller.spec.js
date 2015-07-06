'use strict';

describe('Controller: TitleEditorCtrl', function () {

  // load the controller's module
  beforeEach(module('manticoreApp'));

  var TitleEditorCtrl, scope;

  // Initialize the controller and a mock scope
  beforeEach(inject(function ($controller, $rootScope) {
    scope = $rootScope.$new();
    TitleEditorCtrl = $controller('TitleEditorCtrl', {
      $scope: scope
    });
  }));

  it('should ...', function () {
    expect(1).toEqual(1);
  });
});
