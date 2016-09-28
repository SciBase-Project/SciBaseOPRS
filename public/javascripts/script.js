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

$(document).ready(function() {
	var $cat = $("#dropdown-cat");
	var $subCat = $("#dropdown-subcat");
	var $filterButton = $('#filter-button');

	// If category and subcategory are already present in URL
	var catFromUrl = getParameterByName('cat');
	var subCatFromUrl = getParameterByName('subcat');

	if (catFromUrl)
		$('#dropdown-cat option:selected').attr("selected",null);
		$('#dropdown-cat option[value="'+catFromUrl+'"]').attr('selected','selected');

	if (catFromUrl && subCatFromUrl) {
		$subCat.removeClass("hidden");
		$.getJSON("/getSubCategories?category_id=" + catFromUrl, function(data) {
			console.log("data:",data);
			if(data.length > 0) {
				$.each(data, function(index, value) {
					$subCat.append('<option value="' + value.value + '">' + value.title + '</option>');
				});
				$filterButton.removeClass('disabled');
			} else {
				$subCat.addClass('hidden');
				$filterButton.removeClass('disabled');
			}
			$('#dropdown-subcat option:selected').attr("selected",null);
			$('#dropdown-subcat option[value="'+subCatFromUrl+'"]').attr('selected','selected');
		});
	}

	// When category dropdown changes
	$cat.change(function() {
		var selectedCat = $("option:selected", this).val();
		$filterButton.addClass('disabled');
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
					$filterButton.removeClass('disabled');
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

	// Filter results by category and/or subcategory.
	$filterButton.click(function (e) {
		e.preventDefault();
		var newUrl = window.location.protocol + '//' + window.location.host;
		var cat = $cat.val(), subCat = $subCat.val(), query, page;
		var params = [];

		page = getParameterByName('p') || 1;
		query = getParameterByName('q') || null;
		oldCat = getParameterByName('cat');
		oldSubCat = getParameterByName('subcat');

		// Reset results to page 1 if category and/or subcategory is changed.
		if(cat !== oldCat || subCat !== oldSubCat)
			page = '1';

		newUrl += '/public_articles/search';
		
		if (query || cat || subCat || page)
			newUrl += '?';
		if (query)
			params.push('q='+query);
		if (cat && cat !== 'base')
			params.push('cat='+cat);
		if (subCat && subCat !== 'base')
			params.push('subcat='+subCat);
		if (page)
			params.push('p='+page);

		newUrl += params.join('&');

		console.log(newUrl);

		window.location.href = newUrl;
	});
});