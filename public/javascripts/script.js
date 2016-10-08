// Thanks StackOverflow!
function getParameterByName(name, url) {
    if (!url) url = window.location.href;
    name = name.replace(/[\[\]]/g, "\\$&");
    var regex = new RegExp("[?&]" + name + "(=([^&#]*)|&|#|$)"),
        results = regex.exec(url);
    if (!results) return null;
    if (!results[2]) return '';
    return decodeURIComponent(results[2].replace(/\+/g, " "));
}

function setSelectedValue(selectObj, valueToSet) {
    for (var i = 0; i < selectObj.options.length; i++) {
        if (selectObj.options[i].text== valueToSet) {
            selectObj.options[i].selected = true;
            return;
        }
    }
}

function resconstructUrl(e) {
		e.preventDefault();
		var newUrl = window.location.protocol + '//' + window.location.host;
		var params_array = [], current_vals_array = [], url_params = {}, current_values = {};

		// References to form elements
		var $cat = $("#dropdown-cat");
		var $subCat = $("#dropdown-subcat");
		var $filterButton = $('#filter-button');
		var $sortButton = $('#sort-button');
		var $author = $("#text-author");
		var $sortBy = $("#dropdown-sort-by");
		var $order = $("#dropdown-order");

		// Object of current values, i.e. from the form elements
		current_values.p = getParameterByName('p');
		current_values.cat = $cat.val() !== 'base' ? $cat.val() : null;
		current_values.subcat = $subCat.val() !== 'base' ? $subCat.val() : null;
		current_values.a = $author.val() !== "" ? $author.val().replace(/ /g,'+') : null;
		current_values.sort_by = $sortBy.val() !== 'base' ? $sortBy.val() : null;
		current_values.order = $order.val() !== 'base' ? $order.val() : null;

		// Array of non-null values
		current_vals_array =  Array.filter(Object.entries(current_values), function (x) {
			return x[1];
		});

		// Object of values from URL query string
		url_params.p = getParameterByName('p')  || 1;
		url_params.q = getParameterByName('q');
		url_params.a = getParameterByName('a');
		url_params.cat = getParameterByName('cat');
		url_params.subcat = getParameterByName('subcat');
		url_params.sort_by = getParameterByName('sort_by');
		url_params.order = getParameterByName('ord');

		// Construct modified params object taking changed values from the form
		current_vals_array.forEach(function (x) {
			url_params[x[0]] = x[1]; 
		})

		// Final URL params array with non-null values
		params_array = Array.filter(Object.entries(url_params), function (x) {
			return x[1];
		});

		// Reset results to page 1 if category and/or subcategory is changed.
		if(current_values.cat !== url_params.cat || current_values.subcat !== url_params.subcat)
			url_params.p = '1';

		newUrl += '/public_articles/search';
		
		if (params_array.length > 0)
			newUrl += '?';

		newUrl += Array.map(params_array, (y) => { return y.join('=');}).join('&');

		console.log(newUrl);

		window.location.href = newUrl;
	}

$(document).ready(function() {
	var $cat = $("#dropdown-cat");
	var $subCat = $("#dropdown-subcat");
	var $filterButton = $('#filter-button');
	var $sortButton = $('#sort-button');
	var $author = $("#text-author");
	var $sortBy = $("#dropdown-sort-by");
	var $order = $("#dropdown-order");

	// If category and subcategory are already present in URL
	var catFromUrl = getParameterByName('cat');
	var subCatFromUrl = getParameterByName('subcat');
	var sortByFromUrl = getParameterByName('sort_by');
	var sortOrderFromUrl = getParameterByName('order');
	var authorFromUrl = getParameterByName('a');

	if (catFromUrl && !subCatFromUrl) {
		$('#dropdown-cat option:selected').attr("selected",null);
		$('#dropdown-cat option[value="'+catFromUrl+'"]').attr('selected','selected');
		var selectedCat = $("option:selected", this).val();
		$subCat.empty();
		$subCat.append('<option value="base">Sub-Category</option>');
		if(selectedCat !== 'base') {
			$subCat.removeClass("hidden");
			$.getJSON("/getSubCategories?category_id=" + selectedCat, function(data) {
				console.log("data:",data);
				if(data.length > 0) {
					$.each(data, function(index, value) {
						$subCat.append('<option value="' + value.value + '">' + value.title + '</option>');
					});
				} else {
					$subCat.addClass('hidden');
				}
			});
		}
		$subCat.removeClass("hidden");
	}

	if (catFromUrl && subCatFromUrl) {
		$subCat.removeClass("hidden");
		$.getJSON("/getSubCategories?category_id=" + catFromUrl, function(data) {
			console.log("data:",data);
			if(data.length > 0) {
				$.each(data, function(index, value) {
					$subCat.append('<option value="' + value.value + '">' + value.title + '</option>');
				});
			} else {
				$subCat.addClass('hidden');
			}
			$('#dropdown-subcat option:selected').attr("selected",null);
			$('#dropdown-subcat option[value="' + subCatFromUrl + '"]').attr('selected','selected');
		});
	}

	if(authorFromUrl && authorFromUrl.length >= 1) {
		$("#text-author").removeClass("hidden");
		$("#text-author").val(authorFromUrl.replace(/\+/g,' '));
	}

	if(sortByFromUrl) {
		$order.removeClass("hidden");
		$('#dropdown-sort-by option:selected').attr("selected", null);
		$('#dropdown-sort-by option[value="'+sortByFromUrl+'"]').attr('selected','selected');
	}

	if (sortByFromUrl && sortOrderFromUrl) {
		$order.removeClass("hidden");
		$('#dropdown-order option:selected').attr("selected",null);
		$('#dropdown-order option[value="' + sortOrderFromUrl + '"]').attr('selected','selected');
	}	

	// When category dropdown changes
	$cat.change(function() {
		var selectedCat = $("option:selected", this).val();
		$subCat.empty();
		$subCat.append('<option value="base">Sub-Category</option>');
		if(selectedCat !== 'base') {
			$subCat.removeClass("hidden");
			$.getJSON("/getSubCategories?category_id=" + selectedCat, function(data) {
				console.log("data:",data);
				if(data.length > 0) {
					$.each(data, function(index, value) {
						$subCat.append('<option value="' + value.value + '">' + value.title + '</option>');
					});
				} else {
					$subCat.addClass('hidden');
				}
			});
		}
	});

	// When subcategory dropdown changes
	$subCat.change(function() {
		// $filterButton.addClass('disabled');
		if ($("option:selected", this).val() !== 'base')
		{
			$filterButton.removeClass('disabled');
		}
	})

	// When sort_by changes
	$sortBy.change(function () {
		$order.removeClass("hidden");
	})

	// Filter results by category and/or subcategory.
	$filterButton.click(resconstructUrl);

	// Sort results by given criterion
	$sortButton.click(resconstructUrl);
});