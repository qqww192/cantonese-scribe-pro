"""
PyCantonese romanization service for converting Chinese text to Yale and Jyutping.
"""

import asyncio
from typing import Dict, Optional, List
import re

from core.logging import get_logger
from core.exceptions import ProcessingError

logger = get_logger(__name__)


class RomanizationService:
    """Service for Cantonese romanization using PyCantonese."""
    
    def __init__(self):
        self._pycantonese = None
        self._init_lock = asyncio.Lock()
    
    async def _ensure_initialized(self):
        """Ensure PyCantonese is initialized (lazy loading)."""
        if self._pycantonese is None:
            async with self._init_lock:
                if self._pycantonese is None:
                    try:
                        import pycantonese
                        self._pycantonese = pycantonese
                        logger.info("PyCantonese initialized successfully")
                    except ImportError:
                        logger.error("PyCantonese not available")
                        raise ProcessingError("PyCantonese library not installed")
    
    async def romanize(
        self,
        chinese_text: str,
        include_yale: bool = True,
        include_jyutping: bool = True
    ) -> Dict[str, Optional[str]]:
        """
        Romanize Chinese text to Yale and/or Jyutping.
        
        Args:
            chinese_text: Chinese text to romanize
            include_yale: Whether to include Yale romanization
            include_jyutping: Whether to include Jyutping romanization
            
        Returns:
            Dictionary with romanization results
        """
        try:
            await self._ensure_initialized()
            
            # Clean and prepare text
            cleaned_text = self._clean_text(chinese_text)
            if not cleaned_text:
                return {"yale": None, "jyutping": None}
            
            result = {}
            
            # Get Jyutping if requested
            if include_jyutping:
                try:
                    jyutping_result = self._pycantonese.characters_to_jyutping(cleaned_text)
                    jyutping_text = self._format_jyutping(jyutping_result)
                    result["jyutping"] = jyutping_text
                except Exception as e:
                    logger.warning(f"Jyutping conversion failed: {str(e)}")
                    result["jyutping"] = None
            else:
                result["jyutping"] = None
            
            # Get Yale if requested
            if include_yale:
                try:
                    yale_result = self._pycantonese.characters_to_yale(cleaned_text)
                    yale_text = self._format_yale(yale_result)
                    result["yale"] = yale_text
                except Exception as e:
                    logger.warning(f"Yale conversion failed: {str(e)}")
                    result["yale"] = None
            else:
                result["yale"] = None
            
            logger.debug(f"Romanized '{chinese_text}' -> {result}")
            return result
            
        except Exception as e:
            logger.error(f"Error in romanization: {str(e)}")
            return {"yale": None, "jyutping": None}
    
    def _clean_text(self, text: str) -> str:
        """Clean text for better romanization results."""
        if not text:
            return ""
        
        # Remove extra whitespace
        text = re.sub(r'\s+', ' ', text.strip())
        
        # Remove punctuation that might interfere with romanization
        # Keep Chinese characters and basic punctuation
        text = re.sub(r'[^\u4e00-\u9fff\u3400-\u4dbf\uf900-\ufaff\s，。！？；：""''（）【】]', '', text)
        
        return text
    
    def _format_jyutping(self, jyutping_result) -> Optional[str]:
        """Format Jyutping result into readable string."""
        try:
            if not jyutping_result:
                return None
            
            # PyCantonese returns list of tuples (character, jyutping)
            formatted_parts = []
            for char, jyutping in jyutping_result:
                if jyutping:
                    formatted_parts.append(jyutping)
                else:
                    # Keep non-romanizable characters as-is
                    formatted_parts.append(char)
            
            return " ".join(formatted_parts) if formatted_parts else None
            
        except Exception as e:
            logger.warning(f"Error formatting Jyutping: {str(e)}")
            return None
    
    def _format_yale(self, yale_result) -> Optional[str]:
        """Format Yale result into readable string."""
        try:
            if not yale_result:
                return None
            
            # PyCantonese returns list of tuples (character, yale)
            formatted_parts = []
            for char, yale in yale_result:
                if yale:
                    formatted_parts.append(yale)
                else:
                    # Keep non-romanizable characters as-is
                    formatted_parts.append(char)
            
            return " ".join(formatted_parts) if formatted_parts else None
            
        except Exception as e:
            logger.warning(f"Error formatting Yale: {str(e)}")
            return None
    
    async def batch_romanize(
        self,
        text_list: List[str],
        include_yale: bool = True,
        include_jyutping: bool = True
    ) -> List[Dict[str, Optional[str]]]:
        """
        Romanize multiple texts in batch for better performance.
        
        Args:
            text_list: List of Chinese texts to romanize
            include_yale: Whether to include Yale romanization
            include_jyutping: Whether to include Jyutping romanization
            
        Returns:
            List of romanization results
        """
        tasks = [
            self.romanize(text, include_yale, include_jyutping) 
            for text in text_list
        ]
        
        return await asyncio.gather(*tasks, return_exceptions=True)
    
    async def get_word_segmentation(self, chinese_text: str) -> List[str]:
        """
        Get word segmentation for Chinese text.
        
        Args:
            chinese_text: Chinese text to segment
            
        Returns:
            List of segmented words
        """
        try:
            await self._ensure_initialized()
            
            cleaned_text = self._clean_text(chinese_text)
            if not cleaned_text:
                return []
            
            # Use PyCantonese word segmentation
            words = self._pycantonese.segment(cleaned_text)
            
            # Extract word strings
            word_list = [word.word for word in words if word.word.strip()]
            
            logger.debug(f"Segmented '{chinese_text}' into {len(word_list)} words")
            return word_list
            
        except Exception as e:
            logger.error(f"Error in word segmentation: {str(e)}")
            return [chinese_text]  # Return original text as fallback
    
    async def validate_setup(self) -> bool:
        """
        Validate that the romanization service is working correctly.
        
        Returns:
            True if service is working, False otherwise
        """
        try:
            test_result = await self.romanize("你好", include_yale=True, include_jyutping=True)
            return test_result.get("yale") is not None or test_result.get("jyutping") is not None
        except Exception:
            return False


# Global service instance
romanization_service = RomanizationService()