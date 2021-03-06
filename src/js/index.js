import EventEmitter from './utils/events';
import defaultOptions from './defaultOptions';

import * as utils from './utils/type';

const KEY_BACKSPACE = 8,
	KEY_TAB = 9,
	KEY_ENTER = 13,
	KEY_LEFT = 37,
	KEY_RIGHT = 39,
	KEY_DELETE = 46,
	KEY_COMMA = 188;

class bulmaTagsinput extends EventEmitter {
	constructor(selector, options = {}) {
		super();

		this.element = utils.isString(selector) ? document.querySelector(selector) : selector;
		// An invalid selector or non-DOM node has been provided.
		if (!this.element) {
			throw new Error('An invalid selector or non-DOM node has been provided.');
		}
		this._clickEvents = ['click'];

		/// Set default options and merge with instance defined
		this.options = {
			...defaultOptions,
			...options
		};

		if (this.element.dataset.hasOwnProperty('lowercase')) {
			this.options.lowercase = this.element.dataset.lowercase.toLowerCase() === 'true';
		}
		if (this.element.dataset.hasOwnProperty('uppercase')) {
			this.options.uppercase = this.element.dataset.uppercase.toLowerCase() === 'true';
		}
		if (this.element.dataset.hasOwnProperty('duplicates')) {
			this.options.duplicates = this.element.dataset.duplicates.toLowerCase() === 'true';
		}

		this.init();
	}

	/**
	 * Initiate all DOM element containing tagsinput class
	 * @method
	 * @param {string|NodeListOf<Element>} selector
	 * @param {object} options
	 * @return {Array} Array of all TagsInput instances
	 */
	static attach(selector = 'input[type="tags"]', options = {}) {
		let instances = [];

		const elements = (typeof selector === 'object' && selector !== null)
			? selector
			: document.querySelectorAll(selector);

		[].forEach.call(elements, element => {
			setTimeout(() => {
				instances.push(new bulmaTagsinput(element, options));
			}, 100);
		});
		return instances;
	}

	init() {
		if (!this.options.disabled) {
			this.tags = [];
			// The container will visually looks like an input
			this.container = document.createElement('div');
			this.container.className = 'tagsinput';
			this.container.classList.add('field');
			this.container.classList.add('is-grouped');
			this.container.classList.add('is-grouped-multiline');
			this.container.classList.add('input');

			let inputType = this.element.getAttribute('type');
			if (!inputType || inputType === 'tags') {
				inputType = 'text';
			}
			// Create an invisible input element so user will be able to enter value
			this.input = document.createElement('input');
			this.input.setAttribute('type', inputType);
			if (this.element.getAttribute('placeholder')) {
				this.input.setAttribute('placeholder', this.element.getAttribute('placeholder'));
			} else {
				this.input.setAttribute('placeholder', 'Add a Tag');
			}
			this.container.appendChild(this.input);

			let sib = this.element.nextSibling;
			this.element.parentNode[sib ? 'insertBefore':'appendChild'](this.container, sib);
			this.element.style.cssText = 'position:absolute;left:0;top:0;width:1px;height:1px;opacity:0.01;';
			this.element.tabIndex = -1;

			this.enable();
		}
	}

	enable() {
		if (!this.enabled && !this.options.disabled && !this.options.disableEvents) {

			this.element.addEventListener('focus', () => {
				this.container.classList.add('is-focused');
				this.select((Array.prototype.slice.call(this.container.querySelectorAll('.tag:not(.is-delete)'))).pop());
			});

			this.input.addEventListener('focus', () => {
    		this.container.classList.add('is-focused');
    			this.select((Array.prototype.slice.call(this.container.querySelectorAll('.tag:not(.is-delete)'))).pop());
			});
			this.input.addEventListener('blur', () => {
				this.container.classList.remove('is-focused');
				this.select((Array.prototype.slice.call(this.container.querySelectorAll('.tag:not(.is-delete)'))).pop());
				this.savePartial();
			});
			this.input.addEventListener('keydown', (e) => {
				let key = e.charCode || e.keyCode || e.which,
					selectedTag,
					activeTag = this.container.querySelector('.tag.is-active'),
					last = (Array.prototype.slice.call(this.container.querySelectorAll('.tag:not(.is-delete)'))).pop(),
					atStart = this.caretAtStart(this.input);

				if (activeTag) {
					selectedTag = this.container.querySelector('[data-tag="' + activeTag.innerHTML.trim() + '"]');
				}
				this.setInputWidth();

				if (key === KEY_ENTER || key === this.options.delimiter.charCodeAt(0) || key === KEY_COMMA || key === KEY_TAB) {
					if (!this.input.value && (key !== this.options.delimiter.charCodeAt(0) || key === KEY_COMMA)) {
						return;
					}
					this.savePartial();
				} else if (key === KEY_DELETE && selectedTag) {
    			if (selectedTag.nextSibling) {
						this.select(selectedTag.nextSibling.querySelector('.tag'));
					} else if (selectedTag.previousSibling) {
						this.select(selectedTag.previousSibling.querySelector('.tag'));
					}
    			this.container.removeChild(selectedTag);
					this.tags.splice(this.tags.indexOf(selectedTag.getAttribute('data-tag')), 1);
    			this.setInputWidth();
    			this.save();
				} else if (key === KEY_BACKSPACE) {
					if (selectedTag) {
						if (selectedTag.previousSibling) {
    				  this.select(selectedTag.previousSibling.querySelector('.tag'));
						} else if (selectedTag.nextSibling) {
    				  this.select(selectedTag.nextSibling.querySelector('.tag'));
						}
    				this.container.removeChild(selectedTag);
						this.tags.splice(this.tags.indexOf(selectedTag.getAttribute('data-tag')), 1);
    				this.setInputWidth();
    				this.save();
    			} else if (last && atStart) {
    				this.select(last);
    			} else {
    				return;
					}
				} else if (key === KEY_LEFT) {
    			if (selectedTag) {
    				if (selectedTag.previousSibling) {
    					this.select(selectedTag.previousSibling.querySelector('.tag'));
    				}
    			} else if (!atStart) {
    				return;
    			} else {
    				this.select(last);
    			}
    		}
    		else if (key === KEY_RIGHT) {
    			if (!selectedTag) {
						return;
					}
    			this.select(selectedTag.nextSibling.querySelector('.tag'));
    		}
    		else {
    			return this.select();
				}

				e.preventDefault();
				return false;
			});
			this.input.addEventListener('input', () => {
				this.element.value = this.getValue();
				this.element.dispatchEvent(new Event('input'));
			});
			this.input.addEventListener('paste', () => setTimeout(savePartial, 0));

			this.container.addEventListener('mousedown', (e) => { this.refocus(e); });
			this.container.addEventListener('touchstart', (e) => { this.refocus(e); });

			this.savePartial(this.element.value);

			this.enabled = true;
		}
	}

	disable() {
		if (this.enabled && !this.options.disabled) {
			this.reset();

			this.enabled = false;
		}
	}

	select(el) {
		let sel = this.container.querySelector('.is-active');
		if (sel) {
			sel.classList.remove('is-active');
		}
		if (el) {
			el.classList.add('is-active');
		}
	}

	addTag(text) {
		if (~text.indexOf(this.options.delimiter)) {
			text = text.split(this.options.delimiter);
		}
		if (Array.isArray(text)) {
			return text.forEach((text) => {
				this.addTag(text);
			});
		}

		let tag = text && text.trim();
		if (!tag) {
			return false;
		}

		if (this.options['lowercase']) {
			tag = tag.toLowerCase();
		}
		if (this.options['uppercase']) {
			tag = tag.toUpperCase();
		}
		if (this.options['duplicates'] || this.tags.indexOf(tag) === -1) {
			this.tags.push(tag);

			let newTagWrapper = document.createElement('div');
			newTagWrapper.className = 'control';
			newTagWrapper.setAttribute('data-tag', tag);

			let newTag = document.createElement('div');
			newTag.className = 'tags';
			newTag.classList.add('has-addons');

			let newTagContent = document.createElement('span');
			newTagContent.className = 'tag';
			newTagContent.classList.add('is-active');
			this.select(newTagContent);
			newTagContent.innerHTML = tag;

			newTag.appendChild(newTagContent);
			if (this.options.allowDelete) {
				let newTagDeleteButton = document.createElement('a');
				newTagDeleteButton.className = 'tag';
				newTagDeleteButton.classList.add('is-delete');
				this._clickEvents.forEach((event) => {
					newTagDeleteButton.addEventListener(event, (e) => this.removeTag(e.target.closest("[data-tag]")));
				});
				newTag.appendChild(newTagDeleteButton);
			}
			newTagWrapper.appendChild(newTag);

			this.container.insertBefore(newTagWrapper, this.input);
		}
	}

	/**
	 * removes a tag
	 * @param {Node|HTMLElement} tag (with [data-tag])
	 */
	removeTag(tag) {
		let last = (Array.prototype.slice.call(this.container.querySelectorAll('.tag'))).pop(), // last delete X
			atStart = this.caretAtStart(this.input);

		if (tag) {
			this.select(tag.querySelector('span.tag'));

			// call onDelete callback if available, cancel deletion if it returns false
			if (typeof this.options.onDelete === 'function' && this.options.onDelete(tag) === false) return;

			this.container.removeChild(tag);
			this.tags.splice(this.tags.indexOf(tag.dataset.tag), 1);
			this.setInputWidth();
			this.save();
		} else if (last && atStart) {
			this.select(last);
		} else {
			return;
		}
	}

	/**
	 * returns a delimiter-joined list of tags
	 * @return {string}
	 */
	getValue() {
		return this.tags.join(this.options.delimiter);
	}

	setValue(value) {
		(Array.prototype.slice.call(this.container.querySelectorAll('.tag'))).forEach((tag) => {
			this.tags.splice(this.tags.indexOf(tag.innerHTML), 1);
			this.container.removeChild(tag);
		});
		this.savePartial(value);
	}

	setInputWidth() {
		let last = (Array.prototype.slice.call(this.container.querySelectorAll('.control'))).pop();

		if (!this.container.offsetWidth) {
			return;
		}
		this.input.style.width = Math.max(this.container.offsetWidth - (last ? (last.offsetLeft + last.offsetWidth) : 30) - 30, this.container.offsetWidth / 4) + 'px';
	}

	savePartial(value) {
		if (typeof value !== 'string' && !Array.isArray(value)) {
			value = this.input.value;
		}
		if (this.addTag(value) !== false) {
			this.input.value = '';
			this.save();
			this.setInputWidth();
		}
	}

	save() {
		this.element.value = this.tags.join(this.options.delimiter);
		this.element.dispatchEvent(new Event('change'));
	}

	caretAtStart(el) {
		try {
			return el.selectionStart === 0 && el.selectionEnd === 0;
		}
		catch(e) {
			return el.value === '';
		}
	}

	refocus(e) {
		if (e.target.classList.contains('tag')) {
			this.select(e.target);
		}
		if (e.target === this.input) {
			return this.select();
		}
		this.input.focus();
		e.preventDefault();
		return false;
	}

	reset() {
		this.tags = [];
	}

	destroy() {
		this.disable();
		this.reset();
		this.element = null;
	}
}

export default bulmaTagsinput;