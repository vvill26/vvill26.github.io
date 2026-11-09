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
  <div class="term-sec"><span class="pr">$</span> ls -t posts/</div>
  <div class="term-ls">
  {% for p in en_posts %}
    {% assign zh_url = '/zh' | append: p.url %}{% assign zh = site.posts | where: "url", zh_url | first %}
    <div class="e">
      <div class="d">{{ p.date | date: "%Y-%m-%d" }}</div>
      <div>
        <a class="t" href="{{ p.url | relative_url }}">{% if p.series %}{% assign sp = p.series | split: "(" %}{% assign sname = sp.first | strip %}{% assign snum = sp.last | remove: ")" %}<span class="tag" title="{{ sname }}">[{{ sname }} {{ snum }}]</span> {% endif %}{{ p.title }}</a>
        {% if zh %}<a class="zt" href="{{ zh.url | relative_url }}">{{ zh.title }}</a>{% endif %}
      </div>
    </div>
  {% endfor %}
  </div>
</div>
