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
{% assign fw_posts = en_posts | where_exp: "p", "p.series contains 'Forensic Will'" | sort: "date" %}
  <div class="term-sec"><span class="pr">$</span> ls series/forensic-will/ <span class="c"># 法医威尔系列</span></div>
  <div class="c term-sd"># Start from what shipped, work back to what its designers thought was scarce.<br># 从已经出货的东西倒推，设计者当初认为什么最稀缺。</div>
  <div class="term-ls term-series">
  {% for p in fw_posts %}
    {% assign zh_url = '/zh' | append: p.url %}{% assign zh = site.posts | where: "url", zh_url | first %}
    {% assign sp = p.series | split: "(" %}{% assign snum = sp.last | remove: ")" %}
    <div class="e">
      <div class="d">{% if snum contains "companion" %}part {{ snum | split: "," | first }} +{% else %}part {{ snum }}{% endif %}</div>
      <div>
        <a class="t" href="{{ p.url | relative_url }}">{{ p.title }}</a>
        {% if zh %}<a class="zt" href="{{ zh.url | relative_url }}">{{ zh.title }}</a>{% endif %}
        <div class="c term-pd">{{ p.date | date: "%Y-%m-%d" }}{% if snum contains "companion" %} · companion / 配套篇{% endif %}</div>
      </div>
    </div>
  {% endfor %}
  </div>

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
