timepicker-bs4
==============
time picker for Bootstrap 4

## Installation

### Dependencies
- [jQuery](https://jquery.com/)
- [Bootstrap](https://getbootstrap.com/) v4
- [Font Awesome](https://fontawesome.com/) v5

### Manual

```html
<link href="/path/to/bootstrap.css" rel="stylesheet" />
<script src="/path/to/jquery.js"></script>
<script src="/path/to/bootstrap.js"></script>
<script src="/path/to/regular.js"></script>
<script src="/path/to/fontawesome.js"></script>
<script src="/path/to/timepicker-bs4.js"></script>
```

### Usage

```html
<div class="row justify-content-center">
<div class="form-group col-6">
<label for="meet_time">Meeting Time:</label>
<div class="input-group">
<input type="text" id="meet_time" class="form-control" name="meet_time" />
<div class="input-group-append"><button type="button" class="btn btn-outline-secondary" data-toggle="timepicker"><i class="far fa-clock"></i></button></div>
</div>
</div><!-- /.form-group -->
</div>
```

```javascript
jQuery('#meet_time').timepicker();
```

## Options

| Option | Default | Description |
| --- | :---: | --- |
| `format` | <code>hh:mm&nbsp;A</code> | Time format using [Dayjs format](https://day.js.org/docs/en/display/format). |
| `maxTime` | `null` | The maximum allowed time in HH:mm format. This can also be specified using a "max" attribute on the input tag. |
| `minDate` | `null` | The minimum allowed date in HH:mm format. This can also be specified using a "min" attribute on the input tag. |
| `minScreenWidth` | `576` | Minimum screen width where timepicker is enabled. |
| `step` | `60` | Increments in seconds of allowed times. |

## Demo

<a href="https://lesilent.github.io/timepicker-bs4">Online Demo</a>