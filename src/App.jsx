import React, { useState } from 'react';
import { BarChart, Bar, XAxis, YAxis, Tooltip, CartesianGrid, ResponsiveContainer, Cell } from 'recharts';
import { Search, Loader2, AlertCircle, Database, FileText, BarChart2, Target, CheckCircle2, XCircle, Wand2, Network, Calculator, ShieldAlert, ShieldCheck, Layers, Activity, Filter, Unlock, Calendar, Star, FileSearch } from 'lucide-react';

const STOP_WORDS = new Set([
  "the","and","to","of","a","in","for","is","on","that","by","this","with","i","you","it","not","or","be","are","from",
  "at","as","your","all","have","new","more","an","was","we","will","home","can","us","about","if","page","my","has",
  "but","our","one","other","do","no","they","he","up","may","what","which","their","out","use","any","there","see",
  "only","so","his","when","here","who","also","now","get","am","been","would","how","were","me","some","these","its",
  "like","than","had","just","over","into","two","next","go","work","last","most","make","them","should","her","such",
  "please","after","then","well","where","each","she","very","many","said","does","set","under","know","way","could",
  "great","must","made","off","before","did","right","because","those","using","between","even","much","same","both",
  "while","down","three","total","end","without","per","think","since","during","return","times","level","old","main",
  "why","shall","still","every","little","different","too","around","too","left","however","really","say","going",
  "come","again","never","below","less","got","let","results","analysis","study","data","used","using","method",
  "methods","model","models","effect","effects","associated","increased","decreased","higher","lower","compared",
  "significant","significantly","studies","patients","group","groups","levels","role","found","showed","demonstrated",
  "observed","important","within","among","whether","although","activity","protein","expression","gene","genes"
]);

export default function CoreRelateSciMiner() {
  const [keywordInput, setKeywordInput] = useState('');
  const [positiveControl, setPositiveControl] = useState('gene, mutation, dna, clinical, patient, expression');
  const [negativeControl, setNegativeControl] = useState('galaxy, medieval, astronomy, poetry, macroeconomic');
  
  const [minYear, setMinYear] = useState('');
  const [minCitations, setMinCitations] = useState('');
  const [openAccessOnly, setOpenAccessOnly] = useState(false);
  const [publicationType, setPublicationType] = useState('all');
  
  const [maxArticles, setMaxArticles] = useState(100);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);
  const [results, setResults] = useState(null);
  const [activeTab, setActiveTab] = useState('cloud'); 
  const [modalData, setModalData] = useState(null); 

  const fillPositiveControl = () => setPositiveControl('gene, mutation, dna, clinical, patient, expression');
  const fillNegativeControl = () => setNegativeControl('galaxy, medieval, astronomy, poetry, macroeconomic');

  const reconstructAbstract = (invertedIndex) => {
    if (!invertedIndex) return "";
    let maxIndex = 0;
    for (const key in invertedIndex) {
      for (const pos of invertedIndex[key]) {
        if (pos > maxIndex) maxIndex = pos;
      }
    }
    const words = new Array(maxIndex + 1).fill("");
    for (const key in invertedIndex) {
      for (const pos of invertedIndex[key]) {
        words[pos] = key;
      }
    }
    return words.join(" ");
  };

  const processKeywordsData = (articles, keywords) => {
    if (!keywords || keywords.length === 0) return null;

    const matrix = {};
    const individualCounts = {};
    const pairArticles = {}; 
    
    keywords.forEach(k1 => {
      individualCounts[k1] = 0;
      matrix[k1] = {};
      keywords.forEach(k2 => {
        matrix[k1][k2] = 0;
      });
    });

    let articlesAnalyzed = 0;
    
    articles.forEach(article => {
      const title = article.display_name || "";
      const abstract = reconstructAbstract(article.abstract_inverted_index) || "";
      const fullText = `${title} ${abstract}`.toLowerCase();

      const presentKeywords = keywords.filter(kw => fullText.includes(kw));

      if (presentKeywords.length > 0) {
        articlesAnalyzed++;
        presentKeywords.forEach(k1 => {
          individualCounts[k1]++;
          presentKeywords.forEach(k2 => {
            matrix[k1][k2]++;
            
            if (k1 !== k2) {
              const pairKey = [k1, k2].sort().join(' & ');
              if (!pairArticles[pairKey]) pairArticles[pairKey] = [];
              if (!pairArticles[pairKey].some(a => a.id === article.id)) {
                pairArticles[pairKey].push(article);
              }
            }
          });
        });
      }
    });

    const pairsData = [];
    const allPairsData = []; 

    for (let i = 0; i < keywords.length; i++) {
      for (let j = i + 1; j < keywords.length; j++) {
        const k1 = keywords[i];
        const k2 = keywords[j];
        const count = matrix[k1][k2];
        const pairKey = [k1, k2].sort().join(' & ');
        
        const pairObj = {
          pair: `${k1} & ${k2}`,
          count: count,
          articles: pairArticles[pairKey] || []
        };

        allPairsData.push(pairObj);
        
        if (count > 0) {
          pairsData.push(pairObj);
        }
      }
    }
    
    pairsData.sort((a, b) => b.count - a.count);
    allPairsData.sort((a, b) => b.count - a.count);

    return {
      keywords,
      matrix,
      individualCounts,
      allPairsData: allPairsData, 
      pairsData: pairsData.slice(0, 15), 
      articlesWithMatches: articlesAnalyzed
    };
  };

  const processCrossCooccurrence = (articles, groupA, groupB) => {
    if (!groupA || !groupB || groupA.length === 0 || groupB.length === 0) return null;
    
    const crossPairs = [];
    const matrix = {};
    
    groupA.forEach(a => {
      matrix[a] = {};
      groupB.forEach(b => {
        matrix[a][b] = [];
      });
    });

    articles.forEach(article => {
      const text = `${article.display_name || ""} ${reconstructAbstract(article.abstract_inverted_index) || ""}`.toLowerCase();
      const presentA = groupA.filter(a => text.includes(a));
      const presentB = groupB.filter(b => text.includes(b));

      if (presentA.length > 0 && presentB.length > 0) {
        presentA.forEach(a => {
          presentB.forEach(b => {
            matrix[a][b].push(article);
          });
        });
      }
    });

    groupA.forEach(a => {
      groupB.forEach(b => {
        const matchedArticles = matrix[a][b];
        crossPairs.push({
          pair: `${a} & ${b}`,
          count: matchedArticles.length,
          articles: matchedArticles
        });
      });
    });
    
    crossPairs.sort((a, b) => b.count - a.count);
    return crossPairs;
  };

  const processNetworkCloud = (articles, keywords) => {
    const poles = keywords.slice(0, 4);
    if (poles.length < 2) return null;

    const wordCounts = {};
    const wordToPoles = {}; 
    const wordPoleArticles = {}; 

    articles.forEach(article => {
      const title = article.display_name || "";
      const abstract = reconstructAbstract(article.abstract_inverted_index) || "";
      const text = `${title} ${abstract}`.toLowerCase();
      
      const presentPoles = poles.filter(p => text.includes(p));
      if (presentPoles.length === 0) return; 

      const wordsMatch = text.match(/\b[a-z]{3,}\b/g) || [];
      const uniqueWords = [...new Set(wordsMatch)];

      uniqueWords.forEach(w => {
         if (STOP_WORDS.has(w) || poles.includes(w)) return;
         wordCounts[w] = (wordCounts[w] || 0) + 1;
         
         if (!wordToPoles[w]) {
           wordToPoles[w] = {};
           poles.forEach(p => wordToPoles[w][p] = 0);
         }

         if (!wordPoleArticles[w]) {
           wordPoleArticles[w] = {};
           poles.forEach(p => wordPoleArticles[w][p] = []);
         }

         presentPoles.forEach(p => {
           wordToPoles[w][p]++;
           if (!wordPoleArticles[w][p].some(a => a.id === article.id)) {
             wordPoleArticles[w][p].push(article);
           }
         });
      });
    });

    const topWords = Object.keys(wordCounts)
      .sort((a, b) => wordCounts[b] - wordCounts[a])
      .slice(0, 15);

    const poleCoords = {};
    const colors = ['#ef4444', '#3b82f6', '#10b981', '#f59e0b'];
    
    if (poles.length === 2) {
       poleCoords[poles[0]] = { x: 15, y: 50, color: colors[0] };
       poleCoords[poles[1]] = { x: 85, y: 50, color: colors[1] };
    } else if (poles.length === 3) {
       poleCoords[poles[0]] = { x: 50, y: 15, color: colors[0] };
       poleCoords[poles[1]] = { x: 15, y: 85, color: colors[1] };
       poleCoords[poles[2]] = { x: 85, y: 85, color: colors[2] };
    } else { 
       poleCoords[poles[0]] = { x: 15, y: 15, color: colors[0] };
       poleCoords[poles[1]] = { x: 85, y: 15, color: colors[1] };
       poleCoords[poles[2]] = { x: 15, y: 85, color: colors[2] };
       poleCoords[poles[3]] = { x: 85, y: 85, color: colors[3] };
    }

    const nodes = topWords.map(w => {
       let totalPull = 0;
       let sumX = 0;
       let sumY = 0;

       poles.forEach(p => {
          const pull = wordToPoles[w][p];
          totalPull += pull;
          sumX += pull * poleCoords[p].x;
          sumY += pull * poleCoords[p].y;
       });

       let finalX = 50;
       let finalY = 50;
       if (totalPull > 0) {
          finalX = sumX / totalPull;
          finalY = sumY / totalPull;
       }

       finalX += (Math.random() * 24 - 12); 
       finalY += (Math.random() * 60 - 30); 
       
       finalX = Math.max(10, Math.min(90, finalX));
       finalY = Math.max(10, Math.min(90, finalY));

       return {
          text: w,
          count: wordCounts[w],
          x: finalX,
          y: finalY,
          links: poles.map(p => ({
             pole: p,
             strength: wordToPoles[w][p],
             articles: wordPoleArticles[w][p] || []
          }))
       }
    });

    const iterations = 50;
    for (let iter = 0; iter < iterations; iter++) {
       for (let i = 0; i < nodes.length; i++) {
          for (let j = i + 1; j < nodes.length; j++) {
             let dx = nodes[i].x - nodes[j].x;
             let dy = nodes[i].y - nodes[j].y;
             let dist = Math.sqrt(dx * dx + dy * dy);
             let minDist = 14; 

             if (dist < minDist && dist > 0) {
                let overlap = minDist - dist;
                let force = overlap / dist;
                let moveX = dx * force * 0.25; 
                let moveY = dy * force * 0.25;
                
                nodes[i].x += moveX;
                nodes[i].y += moveY;
                nodes[j].x -= moveX;
                nodes[j].y -= moveY;
             }
          }
       }
    }

    nodes.forEach(n => {
       n.x = Math.max(5, Math.min(95, n.x));
       n.y = Math.max(5, Math.min(95, n.y));
    });

    return { poles: poleCoords, nodes, maxCount: wordCounts[topWords[0]] || 1 };
  };

  const generateAllStats = (target, positive, negative, cloud, crossPositive, crossNegative, totalArticles) => {
    const negativePairs = negative && negative.allPairsData ? negative.allPairsData : [];
    const controlCounts = negativePairs.length > 0 ? negativePairs.map(p => p.count) : [0];
    const mean = controlCounts.reduce((a, b) => a + b, 0) / (controlCounts.length || 1);
    const variance = controlCounts.reduce((sum, val) => sum + Math.pow(val - mean, 2), 0) / (controlCounts.length || 1);
    const stdDev = Math.sqrt(variance) || 1;

    const allPairs = [];

    if (target && target.allPairsData) {
      target.allPairsData.forEach(p => {
        const [a, b] = p.pair.split(' & ');
        allPairs.push({ pair: p.pair, count: p.count, countA: target.individualCounts[a], countB: target.individualCounts[b], source: 'Target', articles: p.articles });
      });
    }

    if (crossPositive) {
      crossPositive.forEach(p => {
        if(p.count > 0) {
          const [a, b] = p.pair.split(' & ');
          allPairs.push({ pair: p.pair, count: p.count, countA: target.individualCounts[a], countB: positive.individualCounts[b], source: 'Target x Positive', articles: p.articles });
        }
      });
    }

    if (crossNegative) {
      crossNegative.forEach(p => {
        if(p.count > 0) {
          const [a, b] = p.pair.split(' & ');
          allPairs.push({ pair: p.pair, count: p.count, countA: target.individualCounts[a], countB: negative.individualCounts[b], source: 'Target x Negative', articles: p.articles });
        }
      });
    }

    if (cloud && cloud.nodes) {
      cloud.nodes.forEach(node => {
        node.links.forEach(link => {
          if (link.strength > 0) {
            allPairs.push({
              pair: `${node.text} & ${link.pole}`,
              count: link.strength,
              countA: node.count,
              countB: target.individualCounts[link.pole],
              source: 'Cloud',
              articles: link.articles
            });
          }
        });
      });
    }

    const uniquePairsMap = new Map();
    allPairs.forEach(p => {
      const [a, b] = p.pair.split(' & ');
      const sortedPair = [a, b].sort().join(' & ');
      if (!uniquePairsMap.has(sortedPair)) {
        uniquePairsMap.set(sortedPair, { ...p, pair: sortedPair });
      }
    });

    return Array.from(uniquePairsMap.values()).map(item => {
      const zScore = (item.count - mean) / stdDev;
      const countA = item.countA || 0;
      const countB = item.countB || 0;
      const countBoth = item.count;

      const denominatorJaccard = (countA + countB - countBoth);
      const jaccard = denominatorJaccard > 0 ? (countBoth / denominatorJaccard) : 0;

      const a = countBoth;
      const b = Math.max(0, countA - countBoth);
      const c = Math.max(0, countB - countBoth);
      const d = Math.max(0, totalArticles - (a + b + c));

      const a_adj = a + 0.5;
      const b_adj = b + 0.5;
      const c_adj = c + 0.5;
      const d_adj = d + 0.5;

      const oddsRatio = countBoth === 0 ? 0 : (a_adj * d_adj) / (b_adj * c_adj);

      return {
        ...item,
        meanControl: mean,
        zScore: zScore,
        isSignificant: zScore > 1.96,
        jaccard: jaccard,
        oddsRatio: oddsRatio
      };
    });
  };

  const parseKeywords = (inputStr) => {
    return inputStr
      .split(',')
      .map(k => k.trim().toLowerCase())
      .filter(k => k.length > 0);
  };

  const handleMineData = async () => {
    const targetKeywords = parseKeywords(keywordInput);
    const positiveKeywords = parseKeywords(positiveControl);
    const negativeKeywords = parseKeywords(negativeControl);

    if (targetKeywords.length < 2) {
      setError("Please enter at least two Target Keywords.");
      return;
    }

    setIsLoading(true);
    setError(null);
    setResults(null);
    setActiveTab('cloud');

    try {
      const searchQuery = encodeURIComponent(targetKeywords.join(' '));
      
      const apiFilters = [];
      if (minYear) apiFilters.push(`publication_year:>${parseInt(minYear) - 1}`);
      if (minCitations) apiFilters.push(`cited_by_count:>${parseInt(minCitations) - 1}`);
      if (openAccessOnly) apiFilters.push(`is_oa:true`);
      if (publicationType !== 'all') apiFilters.push(`type:${publicationType}`);
      
      const filterString = apiFilters.length > 0 ? `&filter=${apiFilters.join(',')}` : '';

      let allArticles = [];
      let page = 1;
      let hasMore = true;

      while (allArticles.length < maxArticles && hasMore) {
        const fetchLimit = Math.min(200, maxArticles - allArticles.length); 
        const url = `https://api.openalex.org/works?search=${searchQuery}${filterString}&per-page=${fetchLimit}&page=${page}`;
        const response = await fetch(url);
        
        if (!response.ok) {
          throw new Error(`API Error: ${response.status}`);
        }

        const data = await response.json();
        const fetchedArticles = data.results || [];

        if (fetchedArticles.length === 0) {
          hasMore = false;
        } else {
          allArticles = [...allArticles, ...fetchedArticles];
          page++;
        }

        if (data.meta && allArticles.length >= data.meta.count) {
          hasMore = false;
        }
      }

      const articles = allArticles;

      if (articles.length === 0) {
        setError("No articles found matching the keywords and the selected filters.");
        setIsLoading(false);
        return;
      }

      const targetAnalysis = processKeywordsData(articles, targetKeywords);
      const cloudAnalysis = processNetworkCloud(articles, targetKeywords);
      
      const positiveAnalysis = processKeywordsData(articles, positiveKeywords) || {
        keywords: [], matrix: {}, pairsData: [], allPairsData: [], articlesWithMatches: 0
      };
      const negativeAnalysis = processKeywordsData(articles, negativeKeywords) || {
        keywords: [], matrix: {}, pairsData: [], allPairsData: [], articlesWithMatches: 0
      };

      const crossPositive = processCrossCooccurrence(articles, targetKeywords, positiveKeywords);
      const crossNegative = processCrossCooccurrence(articles, targetKeywords, negativeKeywords);
      
      const statisticalAnalysis = generateAllStats(
        targetAnalysis, 
        positiveAnalysis, 
        negativeAnalysis, 
        cloudAnalysis, 
        crossPositive, 
        crossNegative, 
        articles.length
      );

      setResults({
        totalArticles: articles.length,
        rawArticles: articles,
        target: targetAnalysis,
        cloud: cloudAnalysis,
        positive: positiveAnalysis,
        negative: negativeAnalysis,
        crossPositive,
        crossNegative,
        statisticalAnalysis
      });

    } catch (err) {
      setError(err.message || "An error occurred while fetching data.");
    } finally {
      setIsLoading(false);
    }
  };

  const getChartColors = (tab) => {
    switch (tab) {
      case 'positive': return ['#10b981', '#34d399', '#6ee7b7', '#a7f3d0', '#d1fae5'];
      case 'negative': return ['#f43f5e', '#fb7185', '#fda4af', '#fecdd3', '#ffe4e6'];
      default: return ['#4f46e5', '#6366f1', '#818cf8', '#a5b4fc', '#c7d2fe'];
    }
  };

  const JaccardBadge = ({ value }) => {
    if (value === 0) return <span className="inline-flex items-center px-2 py-0.5 rounded text-[10px] font-bold bg-slate-100 text-slate-400 uppercase">None</span>;
    if (value >= 0.10) return <span className="inline-flex items-center px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-100 text-emerald-800 uppercase">High</span>;
    if (value >= 0.05) return <span className="inline-flex items-center px-2 py-0.5 rounded text-[10px] font-bold bg-amber-100 text-amber-800 uppercase">Moderate</span>;
    return <span className="inline-flex items-center px-2 py-0.5 rounded text-[10px] font-bold bg-slate-100 text-slate-500 uppercase">Low</span>;
  };

  const OddsRatioBadge = ({ value }) => {
    if (value === 0) return <span className="inline-flex items-center px-2 py-0.5 rounded text-[10px] font-bold bg-slate-100 text-slate-400 uppercase">None</span>;
    if (value > 1.5) return <span className="inline-flex items-center px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-100 text-emerald-800 uppercase">Strong</span>;
    if (value > 1.0) return <span className="inline-flex items-center px-2 py-0.5 rounded text-[10px] font-bold bg-amber-100 text-amber-800 uppercase">Positive</span>;
    return <span className="inline-flex items-center px-2 py-0.5 rounded text-[10px] font-bold bg-slate-100 text-slate-500 uppercase">Weak/None</span>;
  };

  const CloudNetworkView = ({ data, crossPositive, crossNegative, onViewArticles, allArticles }) => {
    if (!data || !data.poles) {
      return (
        <div className="p-8 text-center bg-white rounded-2xl border border-slate-200 shadow-sm text-slate-500">
          Please enter at least 2 Target Keywords to generate the Connection Cloud.
        </div>
      );
    }

    const poleKeys = Object.keys(data.poles);
    
    const resolveArticlesForCloud = (term, pole) => {
      const node = data.nodes.find(n => n.text === term);
      if (node) {
        const link = node.links.find(l => l.pole === pole);
        if (link && link.articles && link.articles.length > 0) {
          return link.articles;
        }
      }
      if (allArticles) {
        return allArticles.filter(art => {
          const text = `${art.display_name || ""} ${reconstructAbstract(art.abstract_inverted_index) || ""}`.toLowerCase();
          return text.includes(term.toLowerCase()) && text.includes(pole.toLowerCase());
        });
      }
      return [];
    };

    return (
      <div className="space-y-6 animate-in fade-in duration-300">
        <div className="flex flex-col md:flex-row md:items-center mb-4 bg-white p-6 rounded-xl border border-slate-200 shadow-sm">
          <div className="p-4 rounded-xl flex-shrink-0 bg-violet-50 text-violet-600 mr-4">
            <Network className="w-8 h-8" />
          </div>
          <div>
            <h2 className="text-xl font-bold text-slate-800">Gravitational Term Cloud</h2>
            <p className="text-sm text-slate-600 mt-1">
              Graph visualization of words that most interact with your search keys.
            </p>
          </div>
        </div>

        <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-2 overflow-hidden flex justify-center">
          <svg viewBox="0 0 1000 600" className="w-full h-auto max-h-[600px] bg-slate-50 rounded-xl">
            {data.nodes.map((node, i) => (
              node.links.map((link, j) => {
                if (link.strength === 0) return null;
                const pole = data.poles[link.pole];
                const opacity = Math.min(0.9, link.strength / 4);
                return (
                  <line 
                    key={`line-${i}-${j}`}
                    x1={`${node.x}%`} y1={`${node.y}%`}
                    x2={`${pole.x}%`} y2={`${pole.y}%`}
                    stroke={pole.color}
                    strokeWidth={Math.min(10, Math.max(1.5, link.strength * 1.2))} 
                    strokeOpacity={opacity}
                  />
                );
              })
            ))}

            {data.nodes.map((node, i) => {
              const fontSize = Math.max(12, 12 + (node.count / data.maxCount) * 22);
              return (
                <g key={`node-${i}`} style={{ transform: `translate(${node.x}%, ${node.y}%)` }}>
                  <circle r={fontSize / 2} fill="#e2e8f0" opacity={0.6} />
                  <text 
                    textAnchor="middle" 
                    alignmentBaseline="middle"
                    fill="#475569"
                    fontWeight="600"
                    fontSize={fontSize}
                    style={{ pointerEvents: 'none' }}
                  >
                    {node.text}
                  </text>
                </g>
              );
            })}

            {poleKeys.map((pk, i) => {
              const pole = data.poles[pk];
              return (
                <g key={`pole-${i}`} style={{ transform: `translate(${pole.x}%, ${pole.y}%)` }}>
                  <circle r="40" fill="white" stroke={pole.color} strokeWidth="6" className="shadow-lg" />
                  <text 
                    textAnchor="middle" 
                    alignmentBaseline="middle"
                    fill={pole.color}
                    fontWeight="800"
                    fontSize="18"
                    style={{ textShadow: '0px 2px 4px rgba(255,255,255,0.8)' }}
                  >
                    {pk.length > 12 ? pk.substring(0, 10) + '...' : pk}
                  </text>
                </g>
              );
            })}
          </svg>
        </div>

        <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-6">
          <div className="flex items-center space-x-2 mb-4">
            <Database className="w-5 h-5 text-violet-500" />
            <h3 className="text-md font-bold text-slate-800">Cloud Details and Supporting Articles</h3>
          </div>
          <p className="text-xs text-slate-500 mb-4">Click any blue connection number to open related articles.</p>
          
          <div className="overflow-x-auto rounded-xl border border-slate-200 max-h-[350px] custom-scrollbar">
            <table className="w-full text-sm text-left">
              <thead className="text-xs text-slate-700 uppercase bg-slate-50 sticky top-0 z-10 shadow-sm">
                <tr>
                  <th className="px-4 py-3 border-b font-semibold">Cloud Term</th>
                  <th className="px-4 py-3 border-b font-semibold text-center">Total Frequency</th>
                  {poleKeys.map(pk => (
                    <th key={pk} className="px-4 py-3 border-b font-semibold text-center truncate max-w-[120px]" title={pk}>
                      Linked to: {pk}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {data.nodes.map((node, index) => (
                  <tr key={index} className="bg-white border-b hover:bg-slate-50">
                    <td className="px-4 py-3 font-semibold text-slate-900">
                      <span className="bg-violet-50 text-violet-700 px-2.5 py-1 rounded-md border border-violet-100 font-mono text-xs">
                        {node.text}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-center font-bold text-slate-700">
                      {node.count}
                    </td>
                    {poleKeys.map(pk => {
                      const linkObj = node.links.find(l => l.pole === pk);
                      const strength = linkObj ? linkObj.strength : 0;
                      return (
                        <td key={pk} className={`px-4 py-3 text-center font-medium ${strength > 0 ? 'text-indigo-600 bg-indigo-50/40 hover:bg-indigo-100' : 'text-slate-400'}`}>
                          {strength > 0 ? (
                            <button 
                              onClick={() => {
                                const resolvedArticles = resolveArticlesForCloud(node.text, pk);
                                onViewArticles(`${node.text} & ${pk}`, resolvedArticles);
                              }}
                              className="w-full h-full py-1 font-bold underline decoration-dotted underline-offset-4 cursor-pointer"
                            >
                              {strength}
                            </button>
                          ) : (
                            <span>{strength}</span>
                          )}
                        </td>
                      );
                    })}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mt-6">
          <div className="bg-white rounded-2xl shadow-sm border border-emerald-200 p-6">
            <div className="flex items-center space-x-2 mb-4">
              <CheckCircle2 className="w-5 h-5 text-emerald-500" />
              <h3 className="text-md font-bold text-slate-800">Intersection with Positive Control</h3>
            </div>
            {crossPositive && crossPositive.length > 0 ? (
              <div className="space-y-2 max-h-[300px] overflow-y-auto custom-scrollbar pr-2">
                {crossPositive.map((item, idx) => (
                  <button 
                    key={idx} 
                    onClick={() => { if (item.count > 0) onViewArticles(item.pair, item.articles); }}
                    className={`w-full flex justify-between items-center p-3 rounded-xl text-sm border transition-colors text-left group ${item.count > 0 ? 'bg-emerald-50/70 hover:bg-emerald-100 border-emerald-100 cursor-pointer' : 'bg-slate-50 border-slate-100 opacity-60'}`}
                  >
                    <span className={`font-semibold ${item.count > 0 ? 'text-slate-700 group-hover:text-emerald-800' : 'text-slate-500'}`}>{item.pair}</span>
                    <span className={`${item.count > 0 ? 'bg-emerald-100 text-emerald-700 shadow-sm' : 'bg-slate-200 text-slate-500'} px-2.5 py-1 rounded-full text-xs font-bold`}>{item.count}x</span>
                  </button>
                ))}
              </div>
            ) : (
              <div className="text-sm text-slate-400 italic text-center p-6 bg-slate-50 rounded-xl border border-dashed border-slate-200">
                No intersection found.
              </div>
            )}
          </div>

          <div className="bg-white rounded-2xl shadow-sm border border-rose-200 p-6">
            <div className="flex items-center space-x-2 mb-4">
              <XCircle className="w-5 h-5 text-rose-500" />
              <h3 className="text-md font-bold text-slate-800">Intersection with Negative Control</h3>
            </div>
            {crossNegative && crossNegative.length > 0 ? (
              <div className="space-y-2 max-h-[300px] overflow-y-auto custom-scrollbar pr-2">
                {crossNegative.map((item, idx) => (
                  <button 
                    key={idx} 
                    onClick={() => { if (item.count > 0) onViewArticles(item.pair, item.articles); }}
                    className={`w-full flex justify-between items-center p-3 rounded-xl text-sm border transition-colors text-left group ${item.count > 0 ? 'bg-rose-50/70 hover:bg-rose-100 border-rose-100 cursor-pointer' : 'bg-slate-50 border-slate-100 opacity-60'}`}
                  >
                    <span className={`font-semibold ${item.count > 0 ? 'text-slate-700 group-hover:text-rose-800' : 'text-slate-500'}`}>{item.pair}</span>
                    <span className={`${item.count > 0 ? 'bg-rose-100 text-rose-700 shadow-sm' : 'bg-slate-200 text-slate-500'} px-2.5 py-1 rounded-full text-xs font-bold`}>{item.count}x</span>
                  </button>
                ))}
              </div>
            ) : (
              <div className="text-sm text-slate-400 italic text-center p-6 bg-slate-50 rounded-xl border border-dashed border-slate-200">
                No intersection found.
              </div>
            )}
          </div>
        </div>
      </div>
    );
  };

  const TargetStatsTable = ({ data, onViewArticles }) => {
    if (!data || data.length === 0) return null;

    const sortedData = [...data].sort((a, b) => b.zScore - a.zScore);

    return (
      <div className="bg-white rounded-2xl shadow-sm border border-indigo-200 p-6 mt-6">
        <div className="flex items-center space-x-2 mb-4">
          <Calculator className="w-5 h-5 text-indigo-600" />
          <h3 className="text-lg font-bold text-slate-800">Target Variables Unified Statistics</h3>
        </div>
        <p className="text-xs text-slate-500 mb-4">
          Key statistical metrics calculated specifically for all combinations of your target keywords to determine correlation strength and significance. Click the numbers to view matched articles.
        </p>
        <div className="overflow-x-auto rounded-xl border border-slate-200">
          <table className="w-full text-sm text-left">
            <thead className="text-xs text-slate-700 uppercase bg-slate-50">
              <tr>
                <th className="px-4 py-3 border-b">Target Pair</th>
                <th className="px-4 py-3 border-b text-center">Count</th>
                <th className="px-4 py-3 border-b text-center">Z-Score (Significance)</th>
                <th className="px-4 py-3 border-b text-center">Jaccard (Similarity)</th>
                <th className="px-4 py-3 border-b text-center">Odds Ratio (Association)</th>
              </tr>
            </thead>
            <tbody>
              {sortedData.map((stat, idx) => (
                <tr key={idx} className="bg-white border-b hover:bg-slate-50">
                  <td className="px-4 py-3 font-bold text-slate-800">{stat.pair}</td>
                  <td className="px-4 py-3 text-center font-semibold text-slate-700">{stat.count}</td>
                  <td className="px-4 py-3 text-center">
                    <div className="flex flex-col items-center">
                      <button onClick={() => stat.articles && stat.articles.length > 0 && onViewArticles(stat.pair, stat.articles)} className={`font-mono font-bold ${stat.articles && stat.articles.length > 0 ? 'text-indigo-600 hover:text-indigo-800 underline decoration-dotted underline-offset-4 cursor-pointer' : 'text-slate-500 cursor-default'}`}>
                        {stat.zScore.toFixed(5)}
                      </button>
                      {stat.isSignificant ? (
                        <span className="text-[10px] text-emerald-600 font-bold uppercase mt-1">Significant</span>
                      ) : (
                        <span className="text-[10px] text-rose-600 font-bold uppercase mt-1">Noise</span>
                      )}
                    </div>
                  </td>
                  <td className="px-4 py-3 text-center">
                    <div className="flex flex-col items-center">
                      <button onClick={() => stat.articles && stat.articles.length > 0 && onViewArticles(stat.pair, stat.articles)} className={`font-mono mb-1 font-bold ${stat.articles && stat.articles.length > 0 ? 'text-blue-700 hover:text-blue-900 underline decoration-dotted underline-offset-4 cursor-pointer' : 'text-slate-500 cursor-default'}`}>
                        {stat.jaccard.toFixed(5)}
                      </button>
                      <JaccardBadge value={stat.jaccard} />
                    </div>
                  </td>
                  <td className="px-4 py-3 text-center">
                    <div className="flex flex-col items-center">
                      <button onClick={() => stat.articles && stat.articles.length > 0 && onViewArticles(stat.pair, stat.articles)} className={`font-mono mb-1 font-bold ${stat.articles && stat.articles.length > 0 ? 'text-amber-700 hover:text-amber-900 underline decoration-dotted underline-offset-4 cursor-pointer' : 'text-slate-500 cursor-default'}`}>
                        {stat.oddsRatio.toFixed(5)}
                      </button>
                      <OddsRatioBadge value={stat.oddsRatio} />
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    );
  };

  const StatisticsView = ({ data, onViewArticles }) => {
    if (!data || data.length === 0) return null;

    const zScoreSorted = [...data].sort((a, b) => b.zScore - a.zScore);
    const jaccardSorted = [...data].sort((a, b) => b.jaccard - a.jaccard);
    const orSorted = [...data].sort((a, b) => b.oddsRatio - a.oddsRatio);

    return (
      <div className="space-y-6 animate-in fade-in duration-300">
        <div className="flex flex-col md:flex-row md:items-center mb-4 bg-white p-6 rounded-xl border border-slate-200 shadow-sm">
          <div className="p-4 rounded-xl flex-shrink-0 bg-blue-50 text-blue-600 mr-4">
            <Calculator className="w-8 h-8" />
          </div>
          <div>
            <h2 className="text-xl font-bold text-slate-800">Statistical Metrics and Tests</h2>
            <p className="text-sm text-slate-600 mt-1">
              Mathematical validation for all found pairs. Click on the computed values to inspect the supporting articles.
            </p>
          </div>
        </div>

        <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-6">
          <div className="flex items-center space-x-2 mb-4">
            <Calculator className="w-5 h-5 text-indigo-500" />
            <h3 className="text-md font-bold text-slate-800">1. Noise Validation (Z-Score vs Negative Control)</h3>
          </div>
          <p className="text-xs text-slate-500 mb-4">
            Compares the frequency of each pair against the baseline of random co-occurrences. Z &gt; 1.96 indicates significance ($p &lt; 0.05$).
          </p>
          <div className="overflow-x-auto rounded-xl border border-slate-200 max-h-[300px] custom-scrollbar">
            <table className="w-full text-sm text-left">
              <thead className="text-xs text-slate-700 uppercase bg-slate-50 sticky top-0">
                <tr>
                  <th className="px-4 py-3 border-b">Source</th>
                  <th className="px-4 py-3 border-b">Found Pair</th>
                  <th className="px-4 py-3 border-b text-center">Z-Score</th>
                  <th className="px-4 py-3 border-b text-center">Status</th>
                </tr>
              </thead>
              <tbody>
                {zScoreSorted.map((stat, idx) => (
                  <tr key={idx} className="bg-white border-b hover:bg-slate-50">
                    <td className="px-4 py-3 text-xs text-slate-500 font-medium">{stat.source}</td>
                    <td className="px-4 py-3 font-bold text-slate-800">{stat.pair}</td>
                    <td className="px-4 py-3 text-center">
                      <button onClick={() => stat.articles && stat.articles.length > 0 && onViewArticles(stat.pair, stat.articles)} className={`font-mono font-bold ${stat.articles && stat.articles.length > 0 ? 'text-indigo-600 hover:text-indigo-800 underline decoration-dotted underline-offset-4 cursor-pointer' : 'text-slate-500 cursor-default'}`}>
                        {stat.zScore.toFixed(5)}
                      </button>
                    </td>
                    <td className="px-4 py-3 text-center">
                      {stat.isSignificant ? (
                        <span className="inline-flex items-center space-x-1 px-2.5 py-1 bg-emerald-100 text-emerald-800 rounded-full text-[10px] font-bold uppercase">
                          <ShieldCheck className="w-3 h-3" />
                          <span>Significant</span>
                        </span>
                      ) : (
                        <span className="inline-flex items-center space-x-1 px-2.5 py-1 bg-rose-100 text-rose-800 rounded-full text-[10px] font-bold uppercase">
                          <ShieldAlert className="w-3 h-3" />
                          <span>Noise</span>
                        </span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-6">
            <div className="flex items-center space-x-2 mb-4">
              <Layers className="w-5 h-5 text-blue-500" />
              <h3 className="text-md font-bold text-slate-800">2. Similarity (Jaccard)</h3>
            </div>
            <p className="text-xs text-slate-500 mb-4">
              Measures the exclusivity of the co-occurrence (0 to 1). Ignores total corpus volume.
            </p>
            <div className="overflow-x-auto rounded-xl border border-slate-200 max-h-[300px] custom-scrollbar">
              <table className="w-full text-sm text-left">
                <thead className="text-xs text-slate-700 uppercase bg-slate-50 sticky top-0">
                  <tr>
                    <th className="px-4 py-3 border-b">Source</th>
                    <th className="px-4 py-3 border-b">Pair</th>
                    <th className="px-4 py-3 border-b text-center">Jaccard Index</th>
                    <th className="px-4 py-3 border-b text-center">Relevance</th>
                  </tr>
                </thead>
                <tbody>
                  {jaccardSorted.map((stat, idx) => (
                    <tr key={idx} className="bg-white border-b hover:bg-slate-50">
                      <td className="px-4 py-3 text-xs text-slate-500">{stat.source}</td>
                      <td className="px-4 py-3 font-semibold text-slate-800">{stat.pair}</td>
                      <td className="px-4 py-3 text-center">
                        <button onClick={() => stat.articles && stat.articles.length > 0 && onViewArticles(stat.pair, stat.articles)} className={`font-mono font-bold ${stat.articles && stat.articles.length > 0 ? 'text-blue-700 hover:text-blue-900 underline decoration-dotted underline-offset-4 cursor-pointer' : 'text-slate-500 cursor-default'}`}>
                          {stat.jaccard.toFixed(5)}
                        </button>
                      </td>
                      <td className="px-4 py-3 text-center">
                        <JaccardBadge value={stat.jaccard} />
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-6">
            <div className="flex items-center space-x-2 mb-4">
              <Activity className="w-5 h-5 text-amber-500" />
              <h3 className="text-md font-bold text-slate-800">3. Association (Odds Ratio)</h3>
            </div>
            <p className="text-xs text-slate-500 mb-4">
              Indicates how many times the chance of B appearing increases if A is in the text.
            </p>
            <div className="overflow-x-auto rounded-xl border border-slate-200 max-h-[300px] custom-scrollbar">
              <table className="w-full text-sm text-left">
                <thead className="text-xs text-slate-700 uppercase bg-slate-50 sticky top-0">
                  <tr>
                    <th className="px-4 py-3 border-b">Source</th>
                    <th className="px-4 py-3 border-b">Pair</th>
                    <th className="px-4 py-3 border-b text-center">OR</th>
                    <th className="px-4 py-3 border-b text-center">Strength</th>
                  </tr>
                </thead>
                <tbody>
                  {orSorted.map((stat, idx) => (
                    <tr key={idx} className="bg-white border-b hover:bg-slate-50">
                      <td className="px-4 py-3 text-xs text-slate-500">{stat.source}</td>
                      <td className="px-4 py-3 font-semibold text-slate-800">{stat.pair}</td>
                      <td className="px-4 py-3 text-center">
                        <button onClick={() => stat.articles && stat.articles.length > 0 && onViewArticles(stat.pair, stat.articles)} className={`font-mono font-bold ${stat.articles && stat.articles.length > 0 ? 'text-amber-700 hover:text-amber-900 underline decoration-dotted underline-offset-4 cursor-pointer' : 'text-slate-500 cursor-default'}`}>
                          {stat.oddsRatio.toFixed(5)}
                        </button>
                      </td>
                      <td className="px-4 py-3 text-center">
                        <OddsRatioBadge value={stat.oddsRatio} />
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </div>
    );
  };

  const AnalysisView = ({ data, title, icon, tabType, description, onViewArticles }) => {
    const chartColors = getChartColors(tabType);
    
    if (!data.keywords || data.keywords.length === 0) {
      return (
        <div className="p-8 text-center bg-white rounded-2xl border border-slate-200 shadow-sm text-slate-500">
          No keywords provided for this group.
        </div>
      );
    }

    return (
      <div className="space-y-6 animate-in fade-in duration-300">
        <div className="flex flex-col md:flex-row md:items-center space-y-4 md:space-y-0 md:space-x-4 mb-4 bg-white p-6 rounded-xl border border-slate-200 shadow-sm">
          <div className={`p-4 rounded-xl flex-shrink-0 ${
            tabType === 'positive' ? 'bg-emerald-50 text-emerald-600' : 
            tabType === 'negative' ? 'bg-rose-50 text-rose-600' : 
            'bg-indigo-50 text-indigo-600'
          }`}>
            {icon}
          </div>
          <div>
            <h2 className="text-xl font-bold text-slate-800">{title}</h2>
            <p className="text-sm text-slate-600 mt-1">{description}</p>
            <div className="mt-3 inline-block px-3 py-1 bg-slate-100 rounded-full text-sm font-medium text-slate-700">
              {data.articlesWithMatches} of {results.totalArticles} fetched articles contain &ge;1 term exactly in Title/Abstract
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
          <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-6">
            <div className="flex items-center space-x-2 mb-6">
              <BarChart2 className={`w-5 h-5 ${tabType === 'positive' ? 'text-emerald-500' : tabType === 'negative' ? 'text-rose-500' : 'text-indigo-500'}`} />
              <h3 className="text-lg font-semibold text-slate-800">Top Co-occurrences (Click to view articles)</h3>
            </div>
            
            {data.pairsData.length > 0 ? (
              <div className="h-[400px] w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart 
                    data={data.pairsData} 
                    layout="vertical" 
                    margin={{ top: 5, right: 30, left: 140, bottom: 5 }}
                    onClick={(e) => {
                      if (e && e.activePayload && e.activePayload.length > 0) {
                        const clickedPairData = e.activePayload[0].payload;
                        if (clickedPairData && clickedPairData.articles) {
                          onViewArticles(clickedPairData.pair, clickedPairData.articles);
                        }
                      }
                    }}
                    style={{ cursor: 'pointer' }}
                  >
                    <CartesianGrid strokeDasharray="3 3" horizontal={true} vertical={false} stroke="#e2e8f0" />
                    <XAxis type="number" allowDecimals={false} />
                    <YAxis dataKey="pair" type="category" axisLine={false} tickLine={false} tick={{ fill: '#475569', fontSize: 12 }} width={160} />
                    <Tooltip cursor={{fill: '#f8fafc'}} contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }} />
                    <Bar dataKey="count" radius={[0, 4, 4, 0]}>
                      {data.pairsData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={chartColors[index % chartColors.length]} />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </div>
            ) : (
              <div className="h-[400px] flex flex-col items-center justify-center text-slate-500 bg-slate-50 rounded-xl border border-dashed border-slate-300 p-6 text-center">
                <BarChart2 className="w-10 h-10 text-slate-300 mb-3" />
                <p>No co-occurrences found for these keywords.</p>
              </div>
            )}
          </div>

          <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-6 flex flex-col">
            <div className="flex items-center space-x-2 mb-6">
              <Database className={`w-5 h-5 ${tabType === 'positive' ? 'text-emerald-500' : tabType === 'negative' ? 'text-rose-500' : 'text-indigo-500'}`} />
              <h3 className="text-lg font-semibold text-slate-800">Co-occurrence Matrix</h3>
            </div>
            
            <div className="overflow-x-auto overflow-y-auto max-h-[400px] rounded-xl border border-slate-200 flex-grow custom-scrollbar">
              <table className="w-full text-sm text-left">
                <thead className="text-xs text-slate-700 uppercase bg-slate-50 sticky top-0 z-10 shadow-sm">
                  <tr>
                    <th className="px-4 py-3 border-b border-r border-slate-200 font-semibold bg-slate-100 sticky left-0 z-20">Keywords</th>
                    {data.keywords.map(kw => (
                      <th key={kw} className="px-4 py-3 border-b border-slate-200 font-semibold truncate max-w-[120px]" title={kw}>{kw}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {data.keywords.map((rowKw, rowIndex) => (
                    <tr key={rowKw} className="bg-white border-b hover:bg-slate-50 transition-colors">
                      <th className="px-4 py-3 font-medium text-slate-900 border-r border-slate-200 bg-slate-50 truncate max-w-[120px] sticky left-0 z-10 shadow-[1px_0_0_0_#e2e8f0]" title={rowKw}>
                        {rowKw}
                      </th>
                      {data.keywords.map((colKw, colIndex) => {
                        const count = data.matrix[rowKw][colKw];
                        const isSelf = rowIndex === colIndex;
                        return (
                          <td key={colKw} className={`px-4 py-3 text-center ${isSelf ? 'bg-slate-100 text-slate-400 font-medium' : 'text-slate-700 font-semibold'} ${count > 0 && !isSelf ? 'bg-blue-50/50' : ''}`}>
                            {count}
                          </td>
                        );
                      })}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </div>
    );
  };

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 font-sans p-4 md:p-6 lg:p-8">
      <style dangerouslySetInnerHTML={{__html: `
        .custom-scrollbar::-webkit-scrollbar { width: 8px; height: 8px; }
        .custom-scrollbar::-webkit-scrollbar-track { background: #f1f5f9; border-radius: 4px; }
        .custom-scrollbar::-webkit-scrollbar-thumb { background: #cbd5e1; border-radius: 4px; }
        .custom-scrollbar::-webkit-scrollbar-thumb:hover { background: #94a3b8; }
      `}} />
      
      <div className="max-w-[1400px] mx-auto space-y-6">
        <header className="bg-white rounded-3xl shadow-sm border border-slate-200 overflow-hidden">
          <div className="bg-slate-900 px-6 py-8 md:px-10 md:py-10 text-white">
            <div className="flex items-center space-x-3 mb-3">
              <Database className="w-8 h-8 text-indigo-400" />
              <h1 className="text-2xl md:text-3xl font-bold tracking-tight text-white">
                CoreRelateSciMiner <span className="text-indigo-400">(CRSM)</span>
              </h1>
            </div>
            <p className="text-slate-400 max-w-3xl text-sm md:text-base">
              Validate your text mining findings by crossing Targets with Controls and applying rigorous statistical tests (Z-Score, Jaccard, Odds Ratio).
            </p>
          </div>

          <div className="p-6 md:p-10">
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-8">
              <div className="space-y-3 p-5 rounded-2xl bg-indigo-50/50 border border-indigo-100">
                <label className="flex items-center space-x-2 text-sm font-bold text-indigo-900">
                  <Target className="w-4 h-4 text-indigo-500" />
                  <span>Target Keywords</span>
                </label>
                <textarea
                  value={keywordInput}
                  onChange={(e) => setKeywordInput(e.target.value)}
                  placeholder="Ex: TP53, BRCA1, mutation, gene expression..."
                  className="w-full px-4 py-3 rounded-xl border border-indigo-200 focus:ring-2 focus:ring-indigo-500 outline-none resize-none h-28 bg-white text-sm"
                />
              </div>

              <div className="space-y-3 p-5 rounded-2xl bg-emerald-50/50 border border-emerald-100">
                <div className="flex items-center justify-between">
                  <label className="flex items-center space-x-2 text-sm font-bold text-emerald-900">
                    <CheckCircle2 className="w-4 h-4 text-emerald-500" />
                    <span>Positive Control</span>
                  </label>
                  <button onClick={fillPositiveControl} className="text-xs flex items-center space-x-1 px-2 py-1 bg-emerald-100 text-emerald-700 hover:bg-emerald-200 rounded-md font-medium">
                    <Wand2 className="w-3 h-3" />
                    <span>Reset</span>
                  </button>
                </div>
                <textarea
                  value={positiveControl}
                  onChange={(e) => setPositiveControl(e.target.value)}
                  className="w-full px-4 py-3 rounded-xl border border-emerald-200 focus:ring-2 focus:ring-emerald-500 outline-none resize-none h-28 bg-white text-sm"
                />
              </div>

              <div className="space-y-3 p-5 rounded-2xl bg-rose-50/50 border border-rose-100">
                <div className="flex items-center justify-between">
                  <label className="flex items-center space-x-2 text-sm font-bold text-rose-900">
                    <XCircle className="w-4 h-4 text-rose-500" />
                    <span>Negative Control</span>
                  </label>
                  <button onClick={fillNegativeControl} className="text-xs flex items-center space-x-1 px-2 py-1 bg-rose-100 text-rose-700 hover:bg-rose-200 rounded-md font-medium">
                    <Wand2 className="w-3 h-3" />
                    <span>Reset</span>
                  </button>
                </div>
                <textarea
                  value={negativeControl}
                  onChange={(e) => setNegativeControl(e.target.value)}
                  className="w-full px-4 py-3 rounded-xl border border-rose-200 focus:ring-2 focus:ring-rose-500 outline-none resize-none h-28 bg-white text-sm"
                />
              </div>
            </div>

            <div className="border-t border-slate-100 pt-6">
              <div className="flex items-center space-x-2 mb-4">
                <Filter className="w-5 h-5 text-slate-500" />
                <h3 className="text-sm font-bold text-slate-700">Advanced Filters</h3>
              </div>
              
              <div className="flex flex-col md:flex-row flex-wrap gap-4 items-end justify-between">
                <div className="flex flex-wrap gap-4 items-end w-full md:w-auto">
                  <div className="space-y-1">
                    <label className="text-xs font-semibold text-slate-500 flex items-center space-x-1">
                      <Calendar className="w-3 h-3" /> <span>Since Year</span>
                    </label>
                    <input 
                      type="number" 
                      placeholder="e.g. 2018"
                      value={minYear}
                      onChange={e => setMinYear(e.target.value)}
                      className="w-28 px-3 py-2 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500 outline-none bg-white"
                    />
                  </div>

                  <div className="space-y-1">
                    <label className="text-xs font-semibold text-slate-500 flex items-center space-x-1">
                      <Star className="w-3 h-3" /> <span>Min Citations</span>
                    </label>
                    <input 
                      type="number" 
                      placeholder="e.g. 10"
                      value={minCitations}
                      onChange={e => setMinCitations(e.target.value)}
                      className="w-28 px-3 py-2 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500 outline-none bg-white"
                    />
                  </div>

                  <div className="space-y-1">
                    <label className="text-xs font-semibold text-slate-500 flex items-center space-x-1">
                      <FileSearch className="w-3 h-3" /> <span>Article Type</span>
                    </label>
                    <select 
                      value={publicationType}
                      onChange={e => setPublicationType(e.target.value)}
                      className="w-40 px-3 py-2 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500 outline-none bg-white"
                    >
                      <option value="all">All Types</option>
                      <option value="article">Original Research</option>
                      <option value="review">Review</option>
                    </select>
                  </div>

                  <label className="flex items-center space-x-2 cursor-pointer h-[38px] px-3 border border-slate-300 rounded-lg hover:bg-slate-50">
                    <input 
                      type="checkbox" 
                      checked={openAccessOnly}
                      onChange={e => setOpenAccessOnly(e.target.checked)}
                      className="w-4 h-4 text-indigo-600 rounded border-slate-300 focus:ring-indigo-500"
                    />
                    <span className="text-sm font-semibold text-slate-700 flex items-center space-x-1">
                      <Unlock className="w-3 h-3 text-emerald-500" /> <span>Open Access Only</span>
                    </span>
                  </label>
                </div>

                <div className="flex items-center space-x-4 w-full md:w-auto mt-4 md:mt-0 pt-4 md:pt-0 border-t md:border-t-0 border-slate-100">
                  <div className="flex items-center space-x-2">
                    <label className="text-sm font-bold text-slate-700 whitespace-nowrap">Max Articles:</label>
                    <select 
                      value={maxArticles} 
                      onChange={(e) => setMaxArticles(Number(e.target.value))}
                      disabled={isLoading}
                      className="w-full md:w-auto px-3 py-2 border border-slate-300 rounded-lg text-sm bg-white focus:ring-2 focus:ring-indigo-500 outline-none font-semibold text-indigo-700"
                    >
                      <option value={100}>100 (Fast)</option>
                      <option value={250}>250 (Standard)</option>
                      <option value={500}>500 (Advanced)</option>
                      <option value={1000}>1000 (Rigorous)</option>
                    </select>
                  </div>

                  <button
                    onClick={handleMineData}
                    disabled={isLoading}
                    className="w-full md:w-auto bg-slate-900 hover:bg-indigo-600 text-white px-8 py-2.5 rounded-xl font-medium flex items-center justify-center space-x-2 transition-all shadow-md disabled:opacity-70 h-[40px]"
                  >
                    {isLoading ? (
                      <>
                        <Loader2 className="w-4 h-4 animate-spin" />
                        <span>Processing...</span>
                      </>
                    ) : (
                      <>
                        <Search className="w-4 h-4" />
                        <span>Run Mining</span>
                      </>
                    )}
                  </button>
                </div>
              </div>
            </div>

            {error && (
              <div className="mt-6 p-4 bg-red-50 border border-red-200 text-red-700 rounded-xl flex items-center space-x-3">
                <AlertCircle className="w-6 h-6 flex-shrink-0" />
                <p className="font-medium">{error}</p>
              </div>
            )}
          </div>
        </header>

        {results && (
          <div className="space-y-6">
            <div className="bg-white rounded-2xl p-6 flex items-center shadow-sm border border-slate-200">
              <div className="flex items-center space-x-4">
                <div className="p-3 bg-blue-50 rounded-xl">
                  <FileText className="w-6 h-6 text-blue-600" />
                </div>
                <div>
                  <h3 className="text-slate-500 text-sm font-semibold uppercase tracking-wider">Analysis Corpus</h3>
                  <p className="text-2xl font-bold text-slate-800">{results.totalArticles} Articles Fetched</p>
                </div>
              </div>
            </div>

            <div className="flex flex-col md:flex-row space-y-2 md:space-y-0 md:space-x-2 bg-slate-200/50 p-1.5 rounded-2xl w-full">
              <button
                onClick={() => setActiveTab('cloud')}
                className={`flex-1 flex items-center justify-center space-x-2 px-6 py-3.5 rounded-xl text-sm font-bold transition-all ${
                  activeTab === 'cloud' ? 'bg-white text-violet-700 shadow-sm' : 'text-slate-600 hover:bg-slate-200'
                }`}
              >
                <Network className="w-4 h-4" />
                <span>Connection Cloud</span>
              </button>

              <button
                onClick={() => setActiveTab('target')}
                className={`flex-1 flex items-center justify-center space-x-2 px-6 py-3.5 rounded-xl text-sm font-bold transition-all ${
                  activeTab === 'target' ? 'bg-white text-indigo-700 shadow-sm' : 'text-slate-600 hover:bg-slate-200'
                }`}
              >
                <Target className="w-4 h-4" />
                <span>Target Variables</span>
              </button>
              
              <button
                onClick={() => setActiveTab('controls')}
                className={`flex-1 flex items-center justify-center space-x-2 px-6 py-3.5 rounded-xl text-sm font-bold transition-all ${
                  activeTab === 'controls' ? 'bg-white text-emerald-700 shadow-sm' : 'text-slate-600 hover:bg-slate-200'
                }`}
              >
                <CheckCircle2 className="w-4 h-4" />
                <span>Controls (Pos/Neg)</span>
              </button>

              <button
                onClick={() => setActiveTab('statistics')}
                className={`flex-1 flex items-center justify-center space-x-2 px-6 py-3.5 rounded-xl text-sm font-bold transition-all ${
                  activeTab === 'statistics' ? 'bg-white text-blue-700 shadow-sm' : 'text-slate-600 hover:bg-slate-200'
                }`}
              >
                <Calculator className="w-4 h-4" />
                <span>Statistics</span>
              </button>
            </div>

            <div className="mt-6">
              {activeTab === 'cloud' && (
                <CloudNetworkView 
                  data={results.cloud}
                  crossPositive={results.crossPositive}
                  crossNegative={results.crossNegative}
                  onViewArticles={(pair, articles) => setModalData({ pair, articles: articles || [] })}
                  allArticles={results.rawArticles}
                />
              )}
              {activeTab === 'target' && (
                <div className="space-y-8 animate-in fade-in duration-300">
                  <AnalysisView 
                    data={results.target} 
                    title="Target Analysis" 
                    description="Co-occurrence of the variables of primary interest." 
                    icon={<Target className="w-8 h-8" />} 
                    tabType="target"
                    onViewArticles={(pair, articles) => setModalData({ pair, articles: articles || [] })}
                  />
                  <TargetStatsTable data={results.statisticalAnalysis.filter(s => s.source === 'Target')} onViewArticles={(pair, articles) => setModalData({ pair, articles: articles || [] })} />
                </div>
              )}
              {activeTab === 'controls' && (
                <div className="space-y-8 animate-in fade-in duration-300">
                  <AnalysisView 
                    data={results.positive} 
                    title="Positive Control Baseline" 
                    description="Terms that logically should appear together frequently." 
                    icon={<CheckCircle2 className="w-8 h-8" />} 
                    tabType="positive"
                    onViewArticles={(pair, articles) => setModalData({ pair, articles: articles || [] })}
                  />
                  <div className="border-t-2 border-dashed border-slate-200"></div>
                  <AnalysisView 
                    data={results.negative} 
                    title="Negative Control Baseline" 
                    description="Terms entirely unrelated to the study area." 
                    icon={<XCircle className="w-8 h-8" />} 
                    tabType="negative"
                    onViewArticles={(pair, articles) => setModalData({ pair, articles: articles || [] })}
                  />
                </div>
              )}
              {activeTab === 'statistics' && (
                <StatisticsView data={results.statisticalAnalysis} onViewArticles={(pair, articles) => setModalData({ pair, articles: articles || [] })} />
              )}
            </div>
          </div>
        )}
      </div>

      {modalData && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 backdrop-blur-sm p-4 animate-in fade-in duration-200">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-2xl max-h-[85vh] flex flex-col border border-slate-200">
            <div className="p-5 border-b border-slate-100 flex justify-between items-center bg-slate-50/50 rounded-t-2xl">
              <div>
                <h3 className="font-bold text-lg text-slate-800">Supporting Articles</h3>
                <p className="text-sm text-slate-500 mt-0.5">Showing articles found for <span className="font-semibold text-indigo-600 bg-indigo-50 px-2 py-0.5 rounded">{modalData.pair}</span> ({modalData.articles.length} found).</p>
              </div>
              <button onClick={() => setModalData(null)} className="text-slate-400 hover:text-slate-700 transition-colors p-2 bg-white hover:bg-slate-200 rounded-full shadow-sm border border-slate-200">
                <XCircle className="w-5 h-5" />
              </button>
            </div>
            
            <div className="p-5 overflow-y-auto flex-1 space-y-3 custom-scrollbar bg-slate-50">
              {modalData.articles && modalData.articles.length > 0 ? (
                modalData.articles.map((art, idx) => (
                  <div key={idx} className="border border-slate-200 rounded-xl p-4 hover:shadow-md transition-all bg-white">
                     <h4 className="font-semibold text-slate-800 text-sm mb-3 leading-snug">{art.display_name || "Untitled Article"}</h4>
                     <div className="flex justify-between items-center mt-3 pt-3 border-t border-slate-100">
                       <span className="text-xs font-medium bg-slate-100 text-slate-600 px-2.5 py-1 rounded-md">
                         Published in: {art.publication_year || 'N/A'}
                       </span>
                       {art.doi && (
                         <a href={art.doi} target="_blank" rel="noopener noreferrer" className="text-xs font-bold text-indigo-600 hover:text-indigo-800 flex items-center space-x-1.5 bg-indigo-50 px-3 py-1.5 rounded-lg transition-colors">
                           <span>Open Source</span>
                           <span className="text-[10px]">↗</span>
                         </a>
                       )}
                     </div>
                  </div>
                ))
              ) : (
                <div className="text-center py-8 text-slate-500 text-sm">
                  No detailed articles linked directly to this specific intersection in the current batch.
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}