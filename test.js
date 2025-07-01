<script src="https://widget.reviews.io/polaris/build.js"></script>
<div id="ReviewsWidget"></div>
<script>
new ReviewsWidget('#ReviewsWidget', {
//Your REVIEWS.io Store ID and widget type:
store: 'aftershockpc.com.au',
widget: 'polaris',

//Content settings (store_review,product_review,third_party_review,questions). Choose what to display in this widget:
options: {
    types: 'product_review,questions',
    enable_sentiment_analysis: true,
    lang: 'en',
    //Possible layout options: bordered, large and reverse.
    layout: '',
    //How many reviews & questions to show per page?
    per_page: 15,
    store_review:{
      hide_if_no_results: false,
    },
    third_party_review:{
      hide_if_no_results: false,
    },
    //Product specific settings. Provide product SKU for which reviews should be displayed:
    product_review:{
        //Display product reviews - include multiple product SKUs seperated by Semi-Colons (Main Indentifer in your product catalog )
        sku: '[Multiple SKUs Seperated by Semi-Colons e.g "sku1;sku2;" ]',
        hide_if_no_results: false,
    },
    //Questions settings:
    questions:{
        hide_if_no_results: false,
        enable_ask_question: true,
        enable_ask_question_button_style: false, //Show "be the first to ask a question" text as a button
        show_dates: true,
        //Display group questions by providing a grouping variable, new questions will be assigned to this group.
        grouping:'[Group questions by providing a grouping variable here or a specific product SKU]'
    },
    //Header settings:
    header:{
        enable_summary: true, //Show overall rating & review count
        enable_ratings: true,
        enable_attributes: true,
        enable_image_gallery: true, //Show photo & video gallery
        enable_percent_recommended: false, //Show what percentage of reviewers recommend it
        enable_write_review: true, //Show "Write Review" button
        enable_ask_question: true, //Show "Ask Question" button
        enable_sub_header: true, //Show subheader
        rating_decimal_places: 2,
        use_write_review_button:  false, //Show "be the first to leave a review" text as a button
        enable_if_no_results:  false, //Show header when there are no results
    },

    //AI summary settings
    sentiment:{
        badge_text: 'Our Customers Say'
    },

    //Filtering settings:
    filtering:{
        enable: true, //Show filtering options
        enable_text_search: true, //Show search field
        enable_sorting: true, //Show sorting options (most recent, most popular)
        enable_product_filter: false, //Show product options filter
        enable_media_filter: true, //Show reviews with images/video/media options
        enable_overall_rating_filter: true, //Show overall rating breakdown filter
        enable_language_filter: false, // Filter by review language
        enable_language_filter_language_change: false, // Update widget language based on language selected
        enable_ratings_filters: true, //Show product attributes filter
        enable_attributes_filters: true, //Show author attributes filter
        enable_expanded_filters: false, //Show filters as a section instead of dropdown
    },

    //Review settings:
    reviews:{
        enable_avatar: true, //Show author avatar
        enable_reviewer_name:  true, //Show author name
        enable_reviewer_address:  true, //Show author location
        reviewer_address_format: 'city, country', //Author location display format
        enable_verified_badge: true, //Show "Verified Customer" badge
        enable_subscriber_badge: true, //Show "Verified Subscriber" badge
        review_content_filter: 'undefined', //Filter content
        enable_reviewer_recommends: true, //Show "I recommend it" badge
        enable_attributes: true, //Show author attributes
        enable_product_name: true, //Show display product name
        enable_review_title: undefined, //Show review title
        enable_replies: true, //Show review replies
        enable_images: true, //Show display review photos
        enable_ratings: true, //Show product attributes (additional ratings)
        enable_share: true, //Show share buttons
        enable_helpful_vote: true, //Show "was this helpful?" section
        enable_helpful_display: true, //Show how many times times review upvoted
        enable_report: true, //Show report button
        enable_date: true, //Show when review was published
        enable_third_party_source: true, //Show third party source
        enable_duplicate_reviews: undefined, //Show multiple reviews from the same user

    },
},
//Translation settings
translations: {
    'Verified Customer': 'Verified Customer'
},
//Style settings:
styles: {
    //Base font size is a reference size for all text elements. When base value gets changed, all TextHeading and TexBody elements get proportionally adjusted.
    '--base-font-size': '16px',

    //Button styles (shared between buttons):
    '--common-button-font-family': 'inherit',
    '--common-button-font-size':'16px',
    '--common-button-font-weight':'500',
    '--common-button-letter-spacing':'0',
    '--common-button-text-transform':'none',
    '--common-button-vertical-padding':'10px',
    '--common-button-horizontal-padding':'20px',
    '--common-button-border-width':'2px',
    '--common-button-border-radius':'0px',

    //Primary button styles:
    '--primary-button-bg-color': '#0E1311',
    '--primary-button-border-color': '#0E1311',
    '--primary-button-text-color': '#ffffff',

    //Secondary button styles:
    '--secondary-button-bg-color': 'transparent',
    '--secondary-button-border-color': '#0E1311',
    '--secondary-button-text-color': '#0E1311',

    //Star styles:
    '--common-star-color': '#0E1311',
    '--common-star-disabled-color': 'rgba(0,0,0,0.25)',
    '--medium-star-size': '22px',
    '--small-star-size': '19px',

    //Heading styles:
    '--heading-text-color': '#0E1311',
    '--heading-text-font-weight': '600',
    '--heading-text-font-family': 'inherit',
    '--heading-text-line-height': '1.4',
    '--heading-text-letter-spacing': '0',
    '--heading-text-transform': 'none',

    //Body text styles:
    '--body-text-color': '#0E1311',
    '--body-text-font-weight': '400',
    '--body-text-font-family': 'inherit',
    '--body-text-line-height': '1.4',
    '--body-text-letter-spacing': '0',
    '--body-text-transform': 'none',

    //Input field styles:
    '--inputfield-text-font-family': 'inherit',
    '--input-text-font-size': '14px',
    '--inputfield-text-font-weight': '400',
    '--inputfield-text-color': '#0E1311',
    '--inputfield-border-color': 'rgba(0,0,0,0.2)',
    '--inputfield-background-color': 'transparent',
    '--inputfield-border-width': '1px',
    '--inputfield-border-radius': '0px',

    '--common-border-color': 'rgba(0,0,0,0.15)',
    '--common-border-width': '1px',
    '--common-sidebar-width': '190px',

    //Filters panel styles:
    '--filters-panel-bg-color': 'transparent',
    '--filters-panel-font-size': '16px',
    '--filters-panel-text-color': '16px',
    '--filters-panel-horizontal-padding': '0',
    '--filters-panel-vertical-padding': '0',

    //Slider indicator (for attributes) styles:
    '--slider-indicator-bg-color': 'rgba(0,0,0,0.1)',
    '--slider-indicator-button-color': '#0E1311',
    '--slider-indicator-width': '190px',

    //Badge styles:
    '--badge-icon-color': '#0E1311',
    '--badge-icon-font-size': 'inherit',
    '--badge-text-color': '#0E1311',
    '--badge-text-font-size': 'inherit',
    '--badge-text-letter-spacing': 'inherit',
    '--badge-text-transform': 'inherit',

    //Author styles:
    '--author-font-size': 'inherit',
    '--author-text-transform': 'none',

    //Author avatar styles:
    '--avatar-thumbnail-size': '60px',
    '--avatar-thumbnail-border-radius': '100px',
    '--avatar-thumbnail-text-color': '#0E1311',
    '--avatar-thumbnail-bg-color': 'rgba(0,0,0,0.1)',

    //Product photo or review photo styles:
    '--photo-video-thumbnail-size': '80px',
    '--photo-video-thumbnail-border-radius': '0px',

    //Media (photo & video) slider styles:
    '--mediaslider-scroll-button-icon-color': '#0E1311',
    '--mediaslider-scroll-button-bg-color': 'rgba(255, 255, 255, 0.85)',
    '--mediaslider-overlay-text-color': '#ffffff',
    '--mediaslider-overlay-bg-color': 'rgba(0, 0, 0, 0.8))',
    '--mediaslider-item-size': '110px',

    //Pagination & tabs styles (normal):
    '--pagination-tab-text-color': '#0E1311',
    '--pagination-tab-text-transform': 'none',
    '--pagination-tab-text-letter-spacing': '0',
    '--pagination-tab-text-font-size': '16px',
    '--pagination-tab-text-font-weight': '600',

    //Pagination & tabs styles (active):
    '--pagination-tab-active-text-color': '#0E1311',
    '--pagination-tab-active-text-font-weight': '600',
    '--pagination-tab-active-border-color': '#0E1311',
    '--pagination-tab-border-width': '3px',

    //AI summary styles
    '--sentiment-base-font-size': '15px',
    '--sentiment-panel-bg-color': 'transparent',
    '--sentiment-panel-border-size': '1px',
    '--sentiment-panel-border-color': 'rgba(0, 0, 0, 0.1)',
    '--sentiment-panel-border-radius': '0px',
    '--sentiment-panel-shadow-size': '0px',
    '--sentiment-panel-shadow-color': 'rgba(0, 0, 0, 0.1)',
    '--sentiment-heading-text-color': '#0E1311',
    '--sentiment-heading-text-font-weight': '600',
    '--sentiment-heading-text-font-family': 'inherit',
    '--sentiment-heading-text-line-height': '1.4',
    '--sentiment-heading-text-letter-spacing': '0',
    '--sentiment-heading-text-transform': 'none',
    '--sentiment-body-text-color': '#0E1311',
    '--sentiment-body-text-font-weight': '400',
    '--sentiment-body-text-font-family': 'inherit',
    '--sentiment-body-text-line-height': '1.4',
    '--sentiment-body-text-letter-spacing': '0',
    '--sentiment-body-text-transform': 'none',
    '--sentiment-panel-vertical-padding': '25px',
    '--sentiment-panel-horizontal-padding': '20px',
    '--sentiment-header-text-color': 'inherit',
    '--sentiment-header-text-font-size': '12px',
    '--sentiment-header-text-font-weight': 'inherit',
    '--sentiment-header-bg-color': 'rgba(0, 0, 0, 0.04)',
    '--sentiment-header-border-radius': '50px',
    '--sentiment-header-shadow-size': '0px',
    '--sentiment-header-shadow-color': 'rgba(0, 0, 0, 0.1)',
    '--sentiment-header-vertical-padding': '7px',
    '--sentiment-header-horizontal-padding': '10px',
    '--sentiment-pagination-tab-text-font-size': '13px',
    '--sentiment-pagination-tab-text-font-weight': '600',
    '--sentiment-pagination-tab-text-color': '#0E1311',
    '--sentiment-pagination-tab-text-transform': 'none',
    '--sentiment-pagination-tab-text-letter-spacing': '0',
    '--sentiment-pagination-tab-active-text-color': '#0E1311',
    '--sentiment-pagination-tab-active-text-font-weight': '600',
    '--sentiment-pagination-tab-active-border-color': '#0E1311',
    '--sentiment-pagination-tab-border-width': '3px',
},
});
</script>