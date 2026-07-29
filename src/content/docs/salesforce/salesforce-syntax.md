---
title: Salesforce Syntax
description: Reference for Salesforce Commerce Cloud (Demandware) URL syntax, including product, category, content, and pipeline links.
slug: salesforce/salesforce-syntax
---

Reference for Salesforce Commerce Cloud (SFCC / Demandware) URL pipeline syntax used to link to products, categories, content, search results, and more.

## Product

Directs the user to the Product ID specified after `pid`. In this example the link will take the user to the product with ID of 12345. Replace 12345 with the ID of the product you want the user to go to.

```
$url('Product-Show','pid','12345')$
```

:::caution[Hashtags]
`$url('Search-Show','cgid','12345')$#HASHTAG` — Doesn't work
:::

## Category

Directs the user to the Category ID specified after `cgid`. In this example the link will take the user to the category with the ID of 12345. Replace 12345 with the ID of the category you want the user to go to.

```
$url('Search-Show','cgid','12345')$
```

:::tip[Hashtags]
`$url('Search-Show','cgid','12345','prefn1','filterID','prefv1','filterValue1|filterValue2|filterValue3')$#HASTAG` — Does work
:::

## Category w/ Sorting Rule

Directs the user to the Category ID specified after `cgid` with the default sorting rule specified after `srule`. In this example the link would take the user to the category with the ID of 12345 sorted by sorting rule sortingrule-id.

```
$url('Search-Show','cgid','12345','srule','sortingrule-id')$
```

:::tip[Hashtags]
`$url('Search-Show','cgid','12345')$?prefn1=filterValue&prefv1=filterValue1|filterValue2|filterValue3#HASHTAG` — Does work
:::

## Category w/ Filter, PWA

Directs the user to the Category ID specified after `cgid` with the filter specified after `?fq=` as `FILTERTYPE`, where the values between `%22` are preselected. In this example the link would take the user to the category with the ID of 12345 with the filter `FILTERTYPE` and the corresponding value `filterValue` already selected. Multiple filters can be applied by adding an additional `&fq=` after the first set of filters.

```
$url('Search-Show','cgid','12345')$?fq=FILTERTYPE%3A%22filterValue%22
```

:::note[Taking parameters from a URL]
Replace any quote marks (`""`) with `%22`. For example, `"Wheel+Sets"` becomes `%22Wheel+Sets%22`.
:::

:::caution[Hashtags]
If there is no `prefn1` etc, don't use hashtags on these URLs.
:::

## Category w/ Filter, SFCC

Directs the user to the Category ID specified after `cgid` with the filter specified after `?prefn1`, where the values after `&prefv1` are preselected. In this example the link would take the user to the category with the ID of 12345 with the filter `filterID` and the corresponding values `filterValue1`, `filterValue2`, and `filterValue3` already selected.

```
$url('Search-Show','cgid','12345')$?prefn1=filterValue&prefv1=filterValue1|filterValue2|filterValue3
```

## Content

Directs the user to the Content ID specified after `cid`. In this example the link will take the user to the content asset with the ID of 12345. Replace 12345 with the ID of the content asset you want the user to go to.

```
$url('Page-Show','cid','12345')$
```

## Content Library Folder

Directs the user to the Content Folder ID specified after `fdid`. In this example the link will take the user to the content folder with the ID of 12345. Replace 12345 with the ID of the folder you want the user to go to.

```
$url('Search-ShowContent','fdid','12345')$
```

## Search Results

Directs the user to a search results page for the search term specified after `?q=`. In this example the link will take the user to the search results page for the term `searchterm`. Replace `searchterm` with the search term you want the user to receive results for.

```
$url('Search-Show')$?q=searchterm
```

## Direct Pipeline

Directs the user to the pipeline specified in `Pipeline-Name`. In this example the link will take the user to the pipeline of `Pipeline-Name`. Replace `Pipeline-Name` with the appropriate pipeline name.

```
$url('Pipeline-Name')$
```

## Direct Secure Pipeline

Directs the user to the secure pipeline specified in `Pipeline-Name`. In this example the link will take the user to the pipeline of `Pipeline-Name`. Replace `Pipeline-Name` with the appropriate pipeline name.

```
$httpsURL('Pipeline-Name')$
```

## Anchor Link

Calls the anchor into the resolving URL. Requires an `a name` tag in the resulting page for the anchor to fire.

```
$url('Pipeline','param','value')$#Anchor
```

## Add Tracking Parameters

Directs the user to the Category ID specified after `cgid`. In this example the link will take the user to the category with the ID of 12345 and trigger the tracking parameters set after `?`.

```
$url('Search-Show','cgid','12345')$?utm_source=testSource&utm_medium=testMedium&utm_campaign=testName
```

## Content Asset Include

Includes a content asset into another content asset.

```
$include('Page-Include','cid','YOUR-CONTENT-ASSET-ID')$
```

## Sorting Rule

Adds best seller sorting rule to the end of category URLs.

```
$url('Search-Show','cgid','12345')$?srule=Bestseller
```
