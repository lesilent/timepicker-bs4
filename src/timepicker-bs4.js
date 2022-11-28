/**
 * Time picker for Bootstrap 4
 *
 * https://github.com/lesilent/timepicker-bs4
 */
(function () {
//-------------------------------------
'use strict';

/**
 * Default options for the current modal being displayed
 *
 * @type {object}
 * @todo add support for additional options
 */
var settings = {
	format: 'hh:mm A',
	maxTime: null,
	minTime: null,
	minScreenWidth: 576,
	step: 60
};

/**
 * Array of dayjs format substrings,
 *
 * 0 = used for regex to determine whether format contains unit
 * 1 = format used for buttons and inputs
 * 2 = the unit/view name
 *
 * @var {array}
 */
var FORMATS = [
	['h', 'h', 'hour'],
	['m', 'mm', 'minute'],
	['s', 'ss', 'second'],
	['a', 'A', 'meridiem'],
];

/**
 * Unit lengths
 *
 * @var {object}
 */
var UNIT_LENGTHS = { hour: 24, minute: 60, second: 60, meridiem: 2 };

/**
 *
 * @var {string}
 */
var ACTIVE_CLASS = 'active btn-info';

/**
 *
 * @var {string}
 */
var INACTIVE_CLASS = 'btn-outline-dark border-white';

/**
 * Flag for whether plugin has been initialized
 *
 * @type {boolean}
 */
var initialized = false;

/**
 * Convert special chararacters html entities
 *
 * @param  {string} str the string to encode
 * @return {string} the encoded string
 */
function htmlEncode(str)
{
	return str.replace(/&/g, '&amp;').replace(/>/g, '&gt;').replace(/</g, '&lt;').replace(/"/g, '&quot;');
}

/**
 * Parse a time string and return a dayjs object
 *
 * @param  {string} str
 * @param  {object} options
 * @return {object|boolean} either a dayjs object or false on error
 */
function parseTime(str, options)
{
	var input_time, matches;
	if (typeof str == 'object' && str instanceof dayjs)
	{
		return str.isValid() ? str : false;
	}
	str = str.replace(/^\s+|\s+$/g, '');
	if ((matches = str.match(/^([0-2]?\d)(?:s*:\s*([0-5]\d))?(?:\s*:\s*([0-5]\d))?(?:\s*([AP])\.?M\.?)?$/i))
		&& parseInt(matches[1]) > (matches[4] ? 0 : -1) && parseInt(matches[1]) < (matches[4] ? 13 : 24)
		&& (matches[2] === undefined || (parseInt(matches[2]) > -1 && parseInt(matches[2]) < 60))
		&& (matches[3] === undefined || (parseInt(matches[3]) > -1 && parseInt(matches[3]) < 60)))
	{
		var hour = parseInt(matches[1]);
		if (matches[4])
		{
			hour = hour % 12 + ((matches[4].toUpperCase() == 'P') ? 12 : 0);
		}
		return dayjs().hour(hour).minute(matches[2] == undefined ? 0 : parseInt(matches[2])).second((matches[3] === undefined) ? 0 : parseInt(matches[3]));
	}
	else if (options && options.format && typeof dayjs == 'function')
	{
		input_time = dayjs(str, options.format);
		return input_time.isValid() ? input_time : false;
	}
	return false;
}

/**
 * Return allowed unit text object based on min time, max time, and step
 *
 * @param {object} options
 * @return {object}
 */
function getUnitText(options)
{
	var minTime = options.minTime || dayjs().startOf('day');
	var maxTime = options.maxTime || dayjs().endOf('day');
	var step = options.step || 60;
	var valid = { offset: {}, hour: {}, minute: {}, second: {}, meridiem: {}, length: 0 };
	var iTime = minTime.clone();
	var unixOffset = minTime.startOf('day').unix();
	while (iTime.isBefore(maxTime) || iTime.isSame(maxTime, 'second'))
	{
		valid.offset[iTime.unix() - unixOffset] = true;
		valid.hour[iTime.hour()] = true;
		valid.minute[iTime.minute()] = true;
		valid.second[iTime.second()] = true;
		valid.meridiem[(iTime.hour() > 11) ? 1 : 0] = true;
		valid.length++;
		iTime = iTime.add(step, 'second');
	}

	// Convert valid units to arrays
	var unitText = { hour: [], minute: [], second:[], meridiem: [], length: valid.length };
	for (var i = 0; i < 24; i++)
	{
		unitText.hour.push((i in valid.hour)
			? ((i == 0 || i == 12) ? 12 : i % 12)
			: null);
	}
	['minute', 'second'].forEach(function (field) {
		for (var i = 0; i < 60; i++)
		{
			unitText[field].push((i in valid[field]) ? ((i < 10) ? '0' + i : i) : null);
		}
	});
	unitText.meridiem.push((0 in valid.meridiem) ? 'AM' : null);
	unitText.meridiem.push((1 in valid.meridiem) ? 'PM' : null);
/*
	// Craate position arrays
	for (var i = 1; i < 13; i++)
	{
		position.hour[i] = ((i % 12) in valid.hour || (i % 12 + 12) in valid.hour);
		position.minute[i] = (i * 5 % 60) in valid.minute;
		position.second[i] = (i * 5 % 60) in valid.second;
		position.meridiem[i] = (i % 6 > 0) ? (((i < 6) ? 1 : 0) in valid.meridiem) : false;
	}
*/
	return unitText;
}

/**
 * Update the view
 *
 * @param {object} $input the input object
 */
function updateView($input)
{
	var prevView = $input.data('prevview');
	var view = $input.data('view') || 'hour';
	var viewTime = $input.data('viewtime');
	var options = $input.data('options');
	var step = options.step || 60;
	var submit_disabled = false;
	if (60 % step > 0)
	{
		var minTime = options.minTime || dayjs().startOf('day');
		var viewOffset = viewTime.diff(viewTime.startOf('day'), 'second');
		if (options.format.indexOf('s') < 0)
		{
			viewOffset -= (viewOffset % 60);
		}
		submit_disabled = ((viewOffset - minTime.diff(minTime.startOf('day'), 'second')) % step > 0);
	}
	var input_id = $input.attr('id');
	var $content = jQuery('#' + input_id + '-picker-content').attr('data-view', view);
	$content.find('.submit-btn').prop('disabled', submit_disabled
		|| (options.minTime && viewTime.isBefore(options.minTime, 'second'))
		|| (options.maxTime && viewTime.isAfter(options.maxTime, 'second')));
	var number = null, position = null, format;
	switch (view)
	{
		case 'hour':
			number = viewTime.get(view);
			position = (number % 12 > 0) ? (number % 12) : 12;
			format = 'h' + ((options.format.indexOf('hh') > -1) ? 'h' : '');
			break;
		case 'minute':
		case 'second':
			number = viewTime.get(view);
			if (number % 5 == 0)
			{
				position = (number > 0) ? (number / 5) : 12;
			}
			format = view.charAt(0).repeat(2);
			break;
		case 'meridiem':
			position = (viewTime.hour() > 11) ? 3 : 9;
			format = 'A';
			break;
		default:
			console.warn('Invalid view ' + view);
			return false;
	}
	var text = viewTime.format(format);
	$content.find('.timepicker-btns button').toggleClass('font-weight-bold', false).filter('[data-unit="' + view + '"]').toggleClass('font-weight-bold', true).text(text);
	$content.find('.clock-input-table .chevron-btn').data('unit', view);

	FORMATS.forEach(function (formats) {
		var text = viewTime.format(formats[1]);
		$content.find('.' + formats[2] + '-btn').text(text);
		$content.find('.' + formats[2] + '-input').val(text);
	});

	if (view != prevView)
	{
		var $buttons = $content.find('.clock-input-table button').each(function () {
			var $this = jQuery(this);
			var pos = parseInt($this.attr('class').match(/\bpos\-(\d+)/)[1]);
			var disabled = true;
			if (pos > 0)
			{
				var positions;
				switch (view)
				{
					case 'hour':
						positions = [pos, pos % 12, pos % 12 + 12];
						break;
					case 'minute':
					case 'second':
						positions = [pos % 12 * 5];
						break;
					case 'meridiem':
						positions = (pos % 6 > 0) ? [(pos < 6) ? 1 : 0] : [];
						break;
				}
				positions.forEach(function (pos) {
					disabled &&= (options.unitText[view][pos] === null);
				});
				$this.prop('disabled', disabled).toggleClass('text-light', disabled).toggleClass(INACTIVE_CLASS, pos != position).toggleClass(ACTIVE_CLASS, pos == position);
			}
			else
			{
				$this.text(text);
			}
		});
	}
	$content.data('prevview', view);
	return true;
}

/**
 * Update the clock picker in the popover
 *
 * @param {object} $input the input object
 */
function updatePicker($input)
{
	var input_id = $input.attr('id');
	var options = $input.data('options');
	var now = dayjs();
	var minTime = options.minTime || dayjs().startOf('day');
	var maxTime = options.maxTime || dayjs().endOf('day');
	var step = options.step || 60;
	var validSteps = { hour: {}, minute: {}, second: {}, meridiem: {} };
	var viewTime = $input.data('viewtime');
	var iTime = minTime.clone();
	while (iTime.isBefore(maxTime) || iTime.isSame(maxTime, 'second'))
	{
		validSteps.hour[iTime.hour()] = true;
		validSteps.minute[iTime.minute()] = true;
		validSteps.second[iTime.second()] = true;
		validSteps.meridiem[(iTime.hour() > 11) ? 1 : 0] = true;
		if (!iTime.isBefore(minTime) && !iTime.isAfter(maxTime))
		{
			if (!viewTime && now.isBefore(iTime))
			{
				viewTime = iTime;
			}
		}
		iTime = iTime.add(step, 'second');
	}
	if (!viewTime)
	{
		viewTime = now.endOf((options.format.indexOf('s') < 0) ? 'minute' : 'second');
	}
	$input.data('viewtime', viewTime);

	// Build html
	var has_second = (options.format.indexOf('s') > -1 && step % 60 > 0);
	var clock_enabled = ((step % 300) == 0) && false;
	var viewHour = viewTime.hour();
	var html = '<div class="clock-input' + (clock_enabled ? '' : ' d-none') + '">'
		+ '<div class="d-flex justify-content-center align-items-center timepicker-btns">'
		+ '<div class="btn-group">'
		+ '<button type="button" class="btn px-2 font-weight-bold hour-btn" data-unit="hour">' + viewTime.format('hh') + '</button>'
		+ '<a class="btn px-0 disabled" href="javascript:void(0)" role="button" aria-disabled="true">:</a>'
		+ '<button type="button" class="btn px-2 minute-btn" data-unit="minute"' + + ((step % 3600 > 0) ? '' : ' disabled="disabled"') + '>' + viewTime.format('mm') + '</button>'
		+ (has_second ? '<a class="btn px-0 disabled" href="javascript:void(0)" role="button" aria-disabled="true">:</a><button type="button" id="' + input_id + '-picker-second-btn" class="btn px-2 second-btn" data-unit="second">' + viewTime.format('ss') + '</button>' : '')
		+ '<button type="button" class="btn px-2 meridiem-btn" data-unit="meridiem">' + viewTime.format('A') + '</button>'
		+ '</div></div>'
		+ ('<table class="clock-input-table table table-sm table-borderless timepicker-table mx-auto w-auto mb-1">'
		+ '<thead class="thead-light"><tr><th class="text-center py-1" colspan="5"><span class="hour">Hour</span><span class="minute">Minute</span><span class="second">Second</span><span class="meridiem">Meridiem</span></th></tr></thead>'
		+ '<tbody>'
		+ '<tr>'
		+ '<td></td>'
		+ '<td class="text-right">{{11}}</td>'
		+ '<td class="text-center">{{12}}</td>'
		+ '<td class="text-left">{{1}}</td>'
		+ '<td></td>'
		+ '</tr><tr>'
		+ '<td class="text-right">{{10}}</td>'
		+ '<td class="text-center align-bottom" colspan="3"><a id="' + input_id + '-picker-add-link" class="btn btn-link px-1 mx-0 chevron-btn" data-step="1" href="javascript:void(0)"><i class="fas fa-chevron-up fa-lg"></i></a></td>'
		+ '<td class="text-left">{{2}}</td>'
		+ '</tr><tr>'
		+ '<td class="text-right">{{9}}</td>'
		+ '<td class="text-center" colspan="3">{{0}}</td>'
		+ '<td class="text-left">{{3}}</td>'
		+ '</tr><tr>'
		+ '<td class="text-right">{{8}}</td>'
		+ '<td class="text-center" colspan="3"><a id="' + input_id + '-picker-sub-link" class="btn btn-link px-1 mx-0 chevron-btn" data-step="-1" href="javascript:void(0)"><i class="fas fa-chevron-down fa-lg"></i></a></td>'
		+ '<td class="text-left">{{4}}</td>'
		+ '</tr><tr>'
		+ '<td></td>'
		+ '<td class="text-right">{{7}}</td>'
		+ '<td class="text-center">{{6}}</td>'
		+ '<td class="text-left">{{5}}</td>'
		+ '<td></td>'
		+ '</tr></tbody></table>').replace(/{{(\w+)}}/g, function (match, position) {
			if (position == 0)
			{
				return '<button type="button" id="'+ input_id + '-picker-center-btn" class="btn btn-outline-dark border-white font-weight-bold pos-0" data-hour="' + viewHour + '"'
					+ (viewHour in validSteps.hour ? '' : ' disabled="disabled"')
					+ '>' + ((viewHour % 12 > 0) ? viewHour % 12 : 12) + '</button>';
			}

			var pos_hour = position % 12;
			var pos_minute = pos_hour * 5;

			var meridiem_class = (position % 3 > 0) ? ' text-light' : '';
			var meridiem_text = (position % 6 > 0) ? ((position < 6) ? 'PM' : 'AM') : '&nbsp;';
			return '<button type="button" class="btn px-1 '
				+ ((viewHour % 12 == position % 12) ? 'active btn-info' : 'btn-outline-dark border-white')
				+ ' pos-' + position + '" '
				+ (pos_hour in validSteps.hour ? '' : ' disabled="disabled"')
				+ '><span class="hour">' + position + '</span><span class="minute second">' + (pos_minute > 9 ? '' : '0') + pos_minute + '</span><span class="meridiem' + meridiem_class + '">' + meridiem_text
				+ '</span></button>';
		})
		+ '</div><div class="keyboard-input' + (clock_enabled ? ' d-none' : '') + '"><table class="mx-auto text-center"><tr>'
		+ '<td style="width:3rem"><a class="btn btn-link px-1 mx-0 chevron-btn" data-unit="hour" data-step="1" href="javascript:void(0)"><i class="fas fa-chevron-up fa-lg"></i></a></td>'
		+ '<td></td>'
		+ '<td style="width:3rem"><a class="btn btn-link px-1 mx-0 chevron-btn" data-unit="minute" data-step="1" href="javascript:void(0)"><i class="fas fa-chevron-up fa-lg"></i></a></td>'
		+ (has_second ? '<td></td><td style="width:3rem"><a class="btn btn-link px-1 mx-0 chevron-btn" data-unit="second" data-step="1" href="javascript:void(0)"><i class="fas fa-chevron-up fa-lg"></i></a></td>' : '')
		+ '<td style="width:3.3rem"><a class="btn btn-link px-1 mx-0 chevron-btn" data-unit="meridiem" data-step="1" href="javascript:void(0)"><i class="fas fa-chevron-up fa-lg"></i></a></td>'
		+ '</tr><tr>'
		+ '<td><input type="text" class="form-control text-center border-light hour-input" minlength="1" maxlength="2" /></button></td><td>:</td><td><input type="text" class="form-control text-center border-light minute-input" minlength="1" maxlength="2" /></td>'
		+ (has_second ? '<td>:</td><td><input type="text" class="form-control text-center border-light second-input" minlength="1" maxlength="2" /></td>' : '')
		+ '<td><button type="button" class="btn meridiem-btn"></button></td>'
		+ '</tr><tr>'
		+ '<td><a class="btn btn-link px-1 mx-0 chevron-btn" data-unit="hour" data-step="-1" href="javascript:void(0)"><i class="fas fa-chevron-down fa-lg"></i></a></td>'
		+ '<td></td>'
		+ '<td><a class="btn btn-link px-1 mx-0 chevron-btn" data-unit="minute" data-step="-1" href="javascript:void(0)"><i class="fas fa-chevron-down fa-lg"></i></a></td>'
		+ (has_second ? '<td></td><td><a class="btn btn-link px-1 mx-0 chevron-btn" data-unit="second" data-step="-1" href="javascript:void(0)"><i class="fas fa-chevron-down fa-lg"></i></a></td>' : '')
		+ '<td><a class="btn btn-link px-1 mx-0 chevron-btn" data-unit="meridiem" data-step="-1" href="javascript:void(0)"><i class="fas fa-chevron-down fa-lg"></i></a></td>'
		+ '</tr></table></div>'
		+ '<div class="d-flex justify-content-between">'
		+ '<div class="invisible"><button type="button" class="btn btn-link input-toggle-btn' + (clock_enabled ? ' d-none' : '') + '" data-input="clock"><i class="far fa-clock fa-fw"></i></button><button type="button" class="btn btn-link input-toggle-btn' + (clock_enabled ? '' : ' d-none') + '" data-input="keyboard"><i class="far fa-keyboard fa-fw"></i></button></div>'
		+ '<div><button type="button" class="btn btn-secondary mx-1 cancel-btn" data-dismiss="popover">Cancel</button><button type="button" class="btn btn-primary mx-1 submit-btn">OK</button></div>'
		+ '</div>';

	var $content = jQuery('#' + input_id + '-picker-content');
	var $table = $content.html(html).find('.clock-input-table');
	var $center_btn = jQuery('#' + input_id + '-picker-center-btn');
	$content.find('.timepicker-btns button').on('click', function () {
		var unit = jQuery(this).blur().data('unit');
		$content.find('.clock-input-table .chevron-btn').data('unit', unit);
		updateView($input.data('view', unit));
	});
	var $hour_input = $content.find('.hour-input').on('change', function () {
		var hour = this.value.replace(/\D+/, '');
		if (hour.length > 0)
		{
			hour = parseInt(hour);
			if (hour > -1 && hour < 24 && hour in options.unitText.hour)
			{
				$input.data('viewtime', $input.data('viewtime').hour(hour));
			}
		}
		updateView($input);
	});
	$hour_input.add($content.find('.minute-input, .second-input').on('change', function () {
		var number = this.value.replace(/\D+/, '');
		if (number.length > 0)
		{
			number = parseInt(number);
			var unit = jQuery(this).attr('class').match(/(minute|second)\-input/)[1];
			if (number > -1 && number < 60 && number in options.unitText[unit])
			{
				$input.data('viewtime', $input.data('viewtime').set(unit, number));
			}
		}
		updateView($input);
	})).on('keyup', function (event) {
		if (event.key == 'Enter')
		{
			$content.find('.submit-btn').triggerHandler('click');
		}
	});

	$content.find('.meridiem-btn').on('click', function () {
		$input.data('viewtime', $input.data('viewtime').hour(($input.data('viewtime').hour() + 12) % 24));
		updateView($input);
	}).on('keydown', function (event) {
		var key = event.key.toUpperCase();
		var hour = $input.data('viewtime').hour();
		var offset = 0;
		if (key == 'A' && hour > 12)
		{
			offset = -12;
		}
		else if (key == 'P' && hour < 11)
		{
			offset = 12;
		}
		if (offset != 0)
		{
			$input.data('viewtime', $input.data('viewtime').hour(hour + offset));
			updateView($input);
		}
	});
	$content.find('.input-toggle-btn').attr('tabindex', -1).on('click', function () {
		var input = jQuery(this).data('input');
		$content.find('.clock-input').toggleClass('d-none', input != 'clock');
		$content.find('.keyboard-input').toggleClass('d-none', input != 'keyboard');
		$content.find('.input-toggle-btn').each(function () {
			var $this = jQuery(this);
			$this.toggleClass('d-none', $this.data('input') == input);
		});
		$input.popover('update');
		$hour_input.select();
	});
	$content.find('.cancel-btn').on('click', function () {
		$input.popover('hide');
	});
	$content.find('.submit-btn').on('click', function () {
		$input.val($input.data('viewtime').format($input.data('options').format)).popover('hide').data('view', null).trigger('change');
	});
	$table.find('button').on('click', function () {
		var $this = jQuery(this);
		var viewTime = $input.data('viewtime');
		var position = $this.attr('class').match(/\bpos\-(\d+)/)[1];
		var view = $input.data('view') || 'hour';
		var start = 0;
		switch (view)
		{
			case 'hour':
				if (position > 0)
				{
					viewTime = viewTime.hour(position % 12 + ((viewTime.hour() > 11) ? 12 : 0));
				}
				start = 1;
				break;
			case 'minute':
				if (position > 0)
				{
					viewTime = viewTime.minute(position % 12 * 5);
				}
				start = 2;
				break;
			case 'second':
				if (position > 0)
				{
					viewTime = viewTime.second(position % 12 * 5);
				}
				start = 3;
				break;
			case 'meridiem':
				if (position > 0)
				{
					viewTime = viewTime.hour(viewTime.hour() % 12 + ((position < 6) ? 12 : 0));
				}
				start = 4;
				break;
		}
		$input.data('viewtime', viewTime);
		var picked = true;
		for (var i = start; i < 4; i++)
		{
			var regex = new RegExp(FORMATS[i][0], 'i');
			if (regex.test(options.format))
			{
				position = null;
				var number;
				var nextUnit = FORMATS[i][2];
				switch (nextUnit)
				{
					case 'hour':
						number = viewTime.get(nextUnit) % 12;
						position = (number > 0) ? number : 12;
						break;
					case 'minute':
					case 'second':
						number = viewTime.get(nextUnit);
						if (number % 5 == 0)
						{
							position = (number > 0) ? (number / 5) : 12;
						}
						break;
					case 'meridiem':
						position = (viewTime.hour() > 11) ? 3 : 9;
						break;
				}
				$input.data('view', nextUnit);
				picked = false;
				break;
			}
		}

		if (picked)
		{
			$input.val(viewTime.format(options.format)).popover('hide').data('view', null).trigger('change');
		}
		else
		{
			updateView($input);
		}
	});
	$content.find('.chevron-btn').attr('tabindex', -1).on('click', function () {
		var $this = jQuery(this).blur();
		var options = $input.data('options');
		var unit = $this.data('unit') || 'hour';
		var step = $this.data('step');
		var viewTime = $input.data('viewtime');
		var number = (unit == 'meridiem')
			? ((viewTime.hour() > 11) ? 1 : 0)
			: viewTime.get(unit);
		if (!(number in options.unitText[unit]))
		{
			// Set to number
		}
		if (options.unitText[unit].length < 2)
		{
			return;
		}

		var unitLength = UNIT_LENGTHS[unit];
		switch (unit)
		{
			case 'hour':
			case 'minute':
			case 'second':
				var idx = number;
				do
				{
					idx = (idx + step + unitLength) % unitLength;
					if (options.unitText[unit][idx] !== null)
					{
						$center_btn.text(options.unitText[unit][idx]);
						$input.data('viewtime', viewTime.set(unit, idx));
						break;
					}
				}
				while (idx != number);
				break;
			case 'meridiem':
				var idx = number;
				idx = (idx + step + unitLength) % unitLength;
				if (options.unitText[unit][idx] !== null)
				{
					$center_btn.text(options.unitText[unit][idx]);
					$input.data('viewtime', viewTime.hour(viewTime.hour() % 12 + ((idx > 0) ? 12 : 0)));
				}
				break;
		}
		updateView($input);
	});
	updateView($input);
}

/**
 * Add method for initializing plugin
 */
jQuery.fn.timepicker = function (options) {
	// Get boostrap version
	var bs_version = parseInt(jQuery.fn.dropdown.Constructor.VERSION.replace(/\..+$/, ''));
	if (bs_version < 4)
	{
		console.error('Invalid bootstrap version ' + bs_version + ' detected');
	}

	// Handle functions
	if (typeof options == 'string')
	{
		if (this.length < 1)
		{
			return undefined;
		}
		var input_options = this.data('options') || {};
		switch (options)
		{
			case 'format':
				if (arguments.length > 1)
				{
					if (arguments[1] && typeof arguments[1] == 'string')
					{
						input_options.format = arguments[1];
						this.data('options', input_options);
					}
					else
					{
						console.warn('Invalid format');
					}
				}
				else
				{
					return input_options.format;
				}
				break;
			case 'minTime':
			case 'maxTime':
				if (arguments.length > 1)
				{
					if (arguments[1])
					{
						var newTime = parseTime(arguments[1], input_options);
						if (newTime && newTime.isValid())
						{
							input_options[options] = newTime;
							input_options.unitText = getUnitText(input_options);
							this.data('options', input_options);
						}
						else
						{
							console.warn('Invalid ' + options);
						}
					}
					else
					{
						input_options[options] = null;
						input_options.unitText = getUnitText(input_options);
						this.data('options', input_options);
					}
				}
				else
				{
					return input_options[options];
				}
				break;
			case 'step':
				if (arguments.length > 1)
				{
					if (arguments[1])
					{
						var step = parseInt(arguments[1]);
						if (step > 0 && step < 86400
							&& step % ((input_options.format.indexOf('s') < 0) ? 60 : 1) == 0)
						{
							input_options.step = step;
							input_options.unitText = getUnitText(input_options);
							this.data('options', input_options);
						}
						else
						{
							console.warn('Invalid ' + options);
						}
					}
					else
					{
						input_options.step = 60;
						input_options.unitText = getUnitText(input_options);
						this.data('options', input_options);
					}
				}
				else
				{
					return input_options[options];
				}
				break;
			case 'time':
				if (arguments.length > 1)
				{
					var newTime = (arguments[1]) ? parseTime(arguments[1], input_options) : null;
					return this.val((newTime && newTime.isValid()) ? newTime.format(input_options.format) : '');
				}
				else
				{
					return parseTime(this.val()) || null;
				}
				break;
			case 'viewTime':
				if (arguments.length > 1)
				{
					var newTime = (arguments[1]) ? parseTime(arguments[1], input_options) : null;
					this.data('viewtime', newTime);
				}
				else
				{
					return this.data('viewtime');
				}
			case 'view':
				if (arguments.length > 1)
				{
					var view = arguments[1];
					updateView(jQuery(this).data('view', view));
				}
				else
				{
					return this.data('view');
				}
			default:
				break;
		}
		return this;
	}

	// Initialize code if it hasn't already
	if (!initialized)
	{
		initialized = true;
		var table_class = '.timepicker-table ';
		jQuery(document.head).append('<style id="timepicker-style">'
			+ '.timepicker-popover { font-size: inherit;  }'
			+ '.timepicker-btns .btn:hover { background-color: #e2e6ea; color: #000; }'
			+ '.timepicker-content span.hour, .timepicker-content span.minute, .timepicker-content span.second, .timepicker-content span.meridiem { display: none; }'
			+ '.timepicker-content[data-view="hour"] span.hour,'
			+ '.timepicker-content[data-view="minute"] span.minute,'
			+ '.timepicker-content[data-view="second"] span.second,'
			+ '.timepicker-content[data-view="meridiem"] span.meridiem { display: inline; }'
			+ table_class + 'td button:focus { box-shadow: none !important; }'
			+ table_class + 'td button:not(:disabled):hover { background-color: #6c757d !important; border-color: #6c757d !important; color: #fff; }'
			+ table_class + 'td button:disabled { cursor: not-allowed; }'
			+ table_class + 'td button.today { background-color: #fcf8e3; }'
			+ table_class + 'td, .timepicker-table th { padding: 0; }'
			+ table_class + 'button.btn { min-width: 2.3rem; }'
			+ table_class + 'button:focus { box-shadow: none !important; }'
			+ table_class + 'button:not(:disabled):hover { background-color: #6c757d !important; border-color: #6c757d !important; color: #fff; }'
			+ table_class + 'td button.pos-1 { margin: .6rem 0 0 .4rem; }'
			+ table_class + 'td button.pos-2 { margin: 0 .7rem .3rem 0; }'
			+ table_class + 'td button.pos-3 { margin: 0 0 0 .6rem; }'
			+ table_class + 'td button.pos-4 { margin: .3rem .7rem 0 0; }'
			+ table_class + 'td button.pos-5 { margin: 0 0 .6rem .4rem; }'
			+ table_class + 'td button.pos-6 { margin: .8rem 0 0 0; }'
			+ table_class + 'td button.pos-7 { margin: 0 .4rem .6rem 0; }'
			+ table_class + 'td button.pos-8 { margin: .3rem 0 0 .7rem; }'
			+ table_class + 'td button.pos-9 { margin: 0 .6rem 0 0; }'
			+ table_class + 'td button.pos-10 { margin: 0 0 .3rem .7rem; }'
			+ table_class + 'td button.pos-11 { margin: .6rem .4rem 0 0; }'
			+ table_class + 'td button.pos-12 { margin: 0 0 .6rem 0; }'
			+ '</style>');

		// Make popovers close when clicked outside of them
		jQuery(document.body).on('mouseup', function (e) {
			if (jQuery(e.target).parents('.popover').length == 0)
			{
				jQuery('.timepicker').popover('hide');
			}
		});
	}

	// Process options
	if (typeof options == 'undefined')
	{
		options = {};
	}
	var common_options = jQuery.extend({}, settings, options);

	// Convert to date type if screen doesn't meet the mininum width or an IOS device
	if ((common_options.minScreenWidth && window.screen.width < common_options.minScreenWidth)
		|| /iPad|iPhone|iPod/.test(navigator.userAgent))
	{
		return this.each(function () {
			var $input = jQuery(this);
			this.type = 'time';
			jQuery('[data-toggle="timepicker"][data-target="#' + this.id + '"]').add($input.siblings().find('[data-toggle="timepicker"]')).on('click', function () {
				$input.focus();
				if ('showPicker' in HTMLInputElement.prototype)
				{
					$input[0].showPicker();
				}
			});
		});
	}

	// Initialize the inputs
	return this.each(function () {
		var $input = jQuery(this);

		// Process options
		var input_options = jQuery.extend(true, {}, common_options);
		var format = $input.data('format') || common_options.format;
		if (format)
		{
			input_options.format = format;
		}
		var minTime = $input.attr('min') || $input.data('mintime') || common_options.minTime;
		if (minTime && (minTime = parseTime(minTime)) && minTime.isValid())
		{
			input_options.minTime = minTime;
		}
		var maxTime = $input.attr('max') || $input.data('maxtime') || common_options.maxTime;
		if (maxTime && (maxTime = parseTime(maxTime)) && maxTime.isValid())
		{
			input_options.maxTime = maxTime;
		}
		var step = $input.attr('step') || $input.data('step') || common_options.step;
		if (step > 0 && step < 86400 && 60 % step > 0)
		{
			input_options.step = parseInt(step);
		}
		input_options.unitText = getUnitText(input_options);
		$input.data('options', input_options);
		if ($input.data('timepicker'))
		{
			// If timepicker is already initialized, then return
			return this;
		}
		$input.data('timepicker', true);

		var input_id = this.id;
		var $toggles = [];
		if (this.id)
		{
			$toggles = jQuery('[data-toggle="timepicker"][data-target="#' + this.id + '"]');
		}
		else
		{
			input_id = 'input-' + Math.floor(Math.random() * 1000000 + 1);
			this.id = input_id;
		}
		// If no toggles, then find it based on sibilings
		if ($toggles.length == 0)
		{
			$toggles = $input.siblings().find('[data-toggle="timepicker"]:not([data-target])');
		}
		$input.toggleClass('timepicker', true);

		var $label = jQuery('label[for="' + input_id + '"]');
		$input.on('change', function () {
			this.value = this.value.replace(/^\s+|\s+$/g, '');
			var options = $input.data('options');
			var newTime = parseTime(this.value, options);
			this.value = (newTime !== false) ? newTime.format(options.format) : '';
		}).on('shown.bs.popover', function () {
			jQuery('#' + input_id + '-picker-content').find('.hour-input').select();
		}).on('inserted.bs.popover', function () {
			jQuery('.popover').find('[data-dismiss="popover"]').on('click', function () {
				$input.popover('hide');
			});
			updatePicker($input, input_options);
		}).on('hide.bs.popover', function () {
			$input.data('view', null);
		}).popover({
			html: true,
			placement: 'bottom',
			sanitize: false,
			title: '<button class="close mt-n1" data-dismiss="popover">&times;</button>' + (($label.length > 0) ? $label.html() : 'Time'),
			template: '<div id="' + input_id + '-picker-popover" class="popover timepicker-popover bs-popover-bottom" role="tooltip"><div class="arrow"></div><h3 class="popover-header"></h3><div id="' + input_id + '-popover-body" class="popover-body border-bottom"></div><div class="popover-footer bg-light text-right px-3 py-2 rounded-lg" hidden="hidden"><button type="button" class="btn btn-secondary btn-sm" title="Close the picker" data-dismiss="popover"><i class="fas fa-times"></i> Close</button></div></div>',
			trigger: (($toggles.length > 0) ? 'manual' : 'click'),
			popperConfig: {
/*
				modifiers: {
					hide: {
						enabled: false
					},
					preventOverflow: {
						enabled: false,
//						boundariesElement: 'window',
						escapeWithReference: true
					}
				},
//				positionFixed: true
*/
			},
			content: function () {
				var options = $input.data('options');
				var viewTime = parseTime($input.val(), options);
				$input.data('viewtime', viewTime);
				return '<div id="' + input_id + '-picker-content" class="timepicker-content" data-view="hour"></div>';
			}
		});
		$toggles.on('click', function () {
			$input.popover('toggle');
			this.blur();
		});
	});
};

document.addEventListener('DOMContentLoaded', function() {
	jQuery('[data-toggle="timepicker"][data-target]').each(function () {
		jQuery(jQuery(this).data('target')).timepicker();
	});
});

//-------------------------------------
}());
