/*
 * Copyright (c) 2014-2019 MKLab. All rights reserved.
 *
 * Permission is hereby granted, free of charge, to any person obtaining a
 * copy of this software and associated documentation files (the "Software"),
 * to deal in the Software without restriction, including without limitation
 * the rights to use, copy, modify, merge, publish, distribute, sublicense,
 * and/or sell copies of the Software, and to permit persons to whom the
 * Software is furnished to do so, subject to the following conditions:
 *
 * The above copyright notice and this permission notice shall be included in
 * all copies or substantial portions of the Software.
 *
 * THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
 * IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
 * FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
 * AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
 * LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING
 * FROM, OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER
 * DEALINGS IN THE SOFTWARE.
 *
 */

const fs = require('fs')
const path = require('path')
const codegen = require('./codegen-utils')
const kebabCase = require('lodash.kebabcase');
const camelCase = require('lodash.camelcase');
const snakeCase = require('lodash.snakecase');
const pluralize = require('pluralize')
const capitalize = require('lodash.capitalize')

/**
 * Java Code Generator
 */
class JavaCodeGenerator {

    /**
     * @constructor
     *
     * @param {type.UMLPackage} baseModel
     * @param {string} basePath generated files and directories to be placed
     */
    constructor(baseModel, basePath) {
        /** @member {type.Model} */
        this.baseModel = baseModel

        /** @member {string} */
        this.basePath = basePath
        this.entities = []
    }

    /**
     * Return Indent String based on options
     * @param {Object} options
     * @return {string}
     */
    getIndentString(options) {
        if (options.useTab) {
            return '\t'
        } else {
            var i
            var len
            var indent = []
            for (i = 0, len = options.indentSpaces; i < len; i++) {
                indent.push(' ')
            }
            return indent.join('')
        }
    }

    /**
     * Generate codes from a given element
     * @param {type.Model} elem
     * @param {string} basePath
     * @param {Object} options
     */
    generate(elem, basePath, options) {
        var fullPath
        var pkg

        // Package
        if (elem instanceof type.UMLPackage) {
            if (Array.isArray(elem.ownedElements)) {
                elem.ownedElements.forEach(child => {
                    return this.generate(child, fullPath, options)
                })
            }
            if (elem.stereotype instanceof type.UMLClass && elem.stereotype.name === 'Module') {
                if (this.entities.length > 0) {
                    pkg = app.factory.createModel({
                        id: 'UMLPackage',
                        parent: elem,
                        modelInitializer: function (elem) {
                            elem.name = 'services'
                        }
                    })
                    this.createCrudServices(this.entities, pkg)

                    pkg = app.factory.createModel({
                        id: 'UMLPackage',
                        parent: elem,
                        modelInitializer: function (elem) {
                            elem.name = 'controllers'
                        }
                    })
                    this.createCrudControllers(this.entities, pkg)
                }

                this.entities = []
            }
        } else if (elem instanceof type.UMLClass) {
            if ((elem.stereotype instanceof type.UMLClass
                && elem.stereotype.name === 'Entity')) {
                this.entities.push(elem)
                // Class
            }

        }
    }

    createCrudControllers(entities, pkg) {
        let controller = app.repository.select('Controller')[0]

        return entities.map(entity => {
            let service = app.repository.select(entity.name + 'Service')[0]
            let ctrl = app.factory.createModel({
                id: 'UMLClass',
                parent: pkg,
                modelInitializer: function (elem) {
                    elem.name = entity.name + 'Controller'
                    elem.stereotype = controller

                    let association = new type.UMLAssociation()
                    association._parent = elem
                    association.end1.reference = elem
                    association.end1.navigable = false
                    association.end2.reference = service
                    elem.ownedElements.push(association)
                }
            })
            return ctrl
        })
    }

    createCrudServices(entities, pkg) {
        let injectable = app.repository.select('Injectable')[0]
        let typeOrmCrudService = app.repository.select('TypeOrmCrudService')[0]

        return entities.map(entity => {
            let svc = app.factory.createModel({
                id: 'UMLClass',
                parent: pkg,
                modelInitializer: function (elem) {
                    elem.name = entity.name + 'Service'
                    elem.stereotype = injectable

                    let generalization = new type.UMLGeneralization()
                    generalization._parent = elem
                    generalization.source = elem
                    generalization.target = typeOrmCrudService
                    generalization.stereotype = entity
                    elem.ownedElements.push(generalization)
                }
            })
            return svc
        })
    }

}

/**
 * Generate
 * @param {type.Model} baseModel
 * @param {string} basePath
 * @param {Object} options
 */
function generate(baseModel, basePath, options) {
    var javaCodeGenerator = new JavaCodeGenerator(baseModel, basePath)
    javaCodeGenerator.generate(baseModel, basePath, options)
}

exports.generate = generate