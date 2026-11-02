---
layout: default
---
<div class="term">
  <div class="term-hero">
    <div><span class="pr">$</span> whoami</div>
    <div class="term-big">Will's Notes</div>
    <div class="c"># LLM inference · Hardware–software co-design · Compilers · Serving systems</div>
    <div><span class="pr">$</span> <span class="cur"></span></div>
  </div>

{% assign en_posts = site.posts | where: "lang", "en" %}
{% assign series_posts = en_posts | where_exp: "p", "p.series" | sort: "series" %}
{% if series_posts.size > 0 %}
  <div class="term-sec"><span class="pr">$</span> ls series/chip-software-in-the-ai-era/</div>
  <div class="term-ls">
  {% for p in series_posts %}
    {% assign zh_url = '/zh' | append: p.url %}{% assign zh = site.posts | where: "url", zh_url | first %}
    <div class="e">
      <div class="d">{{ p.date | date: "%Y-%m-%d" }}</div>
      <div>
        <a class="t" href="{{ p.url | relative_url }}"><span class="tag">[{{ forloop.index }}/{{ series_posts.size }}]</span> {{ p.title }}</a>
        {% if zh %}<a class="zt" href="{{ zh.url | relative_url }}">{{ zh.title }}</a>{% endif %}
      </div>
    </div>
  {% endfor %}
  </div>
{% endif %}

{% assign other_posts = en_posts | where_exp: "p", "p.series == nil" %}
{% if other_posts.size > 0 %}
  <div class="term-sec"><span class="pr">$</span> ls posts/</div>
  <div class="term-ls">
  {% for p in other_posts %}
    {% assign zh_url = '/zh' | append: p.url %}{% assign zh = site.posts | where: "url", zh_url | first %}
    <div class="e">
      <div class="d">{{ p.date | date: "%Y-%m-%d" }}</div>
      <div>
        <a class="t" href="{{ p.url | relative_url }}">{{ p.title }}</a>
        {% if zh %}<a class="zt" href="{{ zh.url | relative_url }}">{{ zh.title }}</a>{% endif %}
      </div>
    </div>
  {% endfor %}
  </div>
{% endif %}
</div>
