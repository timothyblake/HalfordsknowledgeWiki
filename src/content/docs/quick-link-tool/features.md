---
title: Feature Guide
description: Learn what each Quick Link Tool action does on the Halfords website.
slug: quick-link-tool/features
---

The Quick Link Tool is a browser bookmarklet for `halfords.com` and `halfords.ie`. Open a Halfords page, select the bookmark, and choose an action to inspect the page, copy useful values, navigate between environments, or remove test data.

![The Quick Link Tool menu](../../../assets/quick-link-tool.png)

Actions that return an ID or URL syntax copy the result to your clipboard and display a confirmation. If the tool cannot find a suitable value on the current page, it displays **No ID found**.

## Switch environments

### Change URL to Stage

Changes the current website from the live `www` environment to the equivalent `staging` environment. The rest of the URL is preserved.

- `www.halfords.com` becomes `staging.halfords.com`
- `www.halfords.ie` becomes `staging.halfords.ie`

### Change URL to Live

Changes the current website from `staging` back to the equivalent live `www` environment while preserving the rest of the URL.

## Get page IDs

### Get Category ID

Finds the category ID in the current page data and copies it to your clipboard. The tool checks the page's injected category data first and then checks the preloaded storefront data.

Use this on a category or product-listing page when you need its category ID for links, testing, or configuration.

For example, use the tool on the [Halfords Cycling](https://www.halfords.com/cycling/) page:

```text
https://www.halfords.com/cycling/
```

The tool copies the following category ID:

```text
165684
```

### Get Content ID

Extracts the content ID from the final `.html` section of the current URL and copies it to your clipboard.

For example, a page ending in `/delivery-information.html` returns:

```text
delivery-information
```

### Get Product ID

Extracts the product ID from the end of a product-page URL and copies it to your clipboard.

For example, use the tool on the [Halfords Advanced 150 Piece Socket and Spanner Set](https://www.halfords.com/tools/hand-tools/socket-sets/halfords-advanced-150-pc-socket-and-spanner-set-735906.html) page:

```text
https://www.halfords.com/tools/hand-tools/socket-sets/halfords-advanced-150-pc-socket-and-spanner-set-735906.html
```

The tool copies the following product ID:

```text
735906
```

## Generate URL syntax

These actions create Salesforce Commerce Cloud URL syntax using the ID found on the current page.

### Get Category Syntax

Copies category search syntax in this format:

```text
$url('Search-Show','cgid','CATEGORY_ID')$
```

### Get Category Syntax with filter

Copies the same category syntax and appends the current page's query string. This is useful when the URL contains filters or other parameters that you want to retain.

```text
$url('Search-Show','cgid','CATEGORY_ID')$?CURRENT_FILTERS
```

### Get Content Syntax

Copies content-page syntax in this format:

```text
$url('Page-Show','cid','CONTENT_ID')$
```

### Get Product Syntax

Copies product-page syntax in this format:

```text
$url('Product-Show','pid','PRODUCT_ID')$
```

## Find a page by ID

### Enter Category ID to find page

Prompts you for a category ID and opens the matching category search page on the current Halfords environment:

```text
/search?cgid=CATEGORY_ID
```

### Enter Product ID to find page

Prompts you for a product ID and opens the matching product page on the current Halfords environment:

```text
/PRODUCT_ID.html
```

## Page cleanup tools

### Remove VRN details

Removes cookies on the current Halfords domain whose names contain `vrn` or `vehicle`, then reloads the page. Use this to clear saved vehicle-registration details while testing.

If no matching cookies are found, the tool displays a message instead of reloading the page.

### Remove Web trends

Reloads the current page with the following Webtrends Optimize kill-switch parameter:

```text
_wt.context=optimize:killswitch
```

If the URL already has query parameters, the kill switch is added to them. Otherwise, it is added as the first query parameter.

## Close the tool

Select the **×** button to close the Quick Link Tool without running an action. Selecting any feature also closes the menu after the action starts.
