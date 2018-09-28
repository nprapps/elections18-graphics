#!/usr/bin/env python

"""
Commands for rendering various parts of the app stack.
"""

from glob import glob
import logging
import os

from fabric.api import local, task
from fabric.state import env

import app
import app_config

logging.basicConfig(format=app_config.LOG_FORMAT)
logger = logging.getLogger(__name__)
logger.setLevel(app_config.LOG_LEVEL)


def _fake_context(path):
    """
    Create a fact request context for a given path.
    """
    return app.app.test_request_context(path=path)


def _view_from_name(name):
    """
    Determine what module a view resides in, then get
    a reference to it.
    """
    bits = name.split('.')

    # Determine which module the view resides in
    if len(bits) > 1:
        module, name = bits
    else:
        module = 'app'

    return globals()[module].__dict__[name]


@task
def less():
    """
    Render LESS files to CSS.
    """
    for path in glob('less/*.less'):
        filename = os.path.split(path)[-1]
        name = os.path.splitext(filename)[0]
        out_path = 'www/css/%s.less.css' % name

        try:
            local('node_modules/less/bin/lessc %s %s' % (path, out_path))
        except:
            logger.error('It looks like "lessc" isn\'t installed. Try running: "npm install"')
            raise


@task
def jst():
    """
    Render Underscore templates to a JST package.
    """
    try:
        local('node_modules/universal-jst/bin/jst.js --template underscore jst www/js/templates.js')
    except:
        logger.error('It looks like "jst" isn\'t installed. Try running: "npm install"')


@task
def app_config_js():
    """
    Render app_config.js to file.
    """
    from static import _app_config_js

    with _fake_context('/js/includes/app_config.js'):
        response = _app_config_js()

    with open('www/js/includes/app_config.js', 'w') as f:
        f.write(response.data)


@task
def copytext_js():
    """
    Render COPY to copy.js.
    """
    from static import _copy_js

    with _fake_context('/js/includes/copy.js'):
        response = _copy_js()

    with open('www/js/includes/copy.js', 'w') as f:
        f.write(response.data)


@task(default=True)
def render(slug):
    """
    Render HTML templates and compile assets.
    """
    if slug:
        _render_graphics(['templates/graphics/%s' % slug])
    else:
        _render_graphics(glob('templates/graphics/*'))


def _render_graphics(paths):
    """
    Render a set of graphics
    """
    from flask import g

    # Fake out deployment target
    app_config.configure_targets(env.get('settings', None))

    for path in paths:
        filename = os.path.split(path)[-1]
        slug = os.path.splitext(filename)[0]

        with app.app.test_request_context(path='%s/' % slug):
            g.compile_includes = True
            g.compiled_includes = {}

            view = app.__dict__['parent']
            content = view(slug).data

        if not os.path.exists('www/%s' % slug):
            os.makedirs('www/%s' % slug)

        with open('www/%s/index.html' % slug, 'w') as writefile:
            writefile.write(content)

        with app.app.test_request_context(path='%s/child.html' % slug):
            g.compile_includes = True
            g.compiled_includes = {}

            view = app.__dict__['child']
            content = view(slug).data

        with open('www/%s/child.html' % slug, 'w') as writefile:
            writefile.write(content)

    app_config_js()
    copytext_js()
    local('npm run build')

    # Un-fake-out deployment target
    app_config.configure_targets(app_config.DEPLOYMENT_TARGET)
